import { prisma } from "../config/prisma";
import { ApiError as GenAIApiError } from "@google/genai";
import { ApiError } from "../utils/api-error";
import { generateStream, generateTitle } from "../utils/gemini";
import { decryption } from "../utils/cryptoUtils";
import type { PaginationType } from "../modules/common.schema";
import type { Prisma } from "@prisma/client";
import type { chatInput } from "../modules/conversation.schema";
import { env } from "../config/env";

interface streamChatProps extends chatInput {
  type: "generate" | "edit" | "retry";
  userId: string;
  onChunk: (type: string, text: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

const MAX_HISTORY_MESSAGES = 40;

export const conversationService = {
  async getApiToken(modelId: number, userId: string) {
    // Check model and token is active and generatable
    const model = await prisma.model.findFirst({
      where: { id: modelId, status: "ACTIVE" },
      select: {
        id: true,
        modelKey: true,
        provider: {
          select: {
            id: true,
            apiTokens: {
              where: {
                userId,
              },
              select: {
                id: true,
                token: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!model) {
      throw new ApiError(400, "Model is inactive");
    }

    const apiToken = model.provider.apiTokens[0];
    if (!apiToken || apiToken.status !== "ACTIVE") {
      throw new ApiError(400, "No active API token");
    }

    // Decrypt token
    let token = "";
    try {
      token = decryption(apiToken.token ?? "");
    } catch {
      throw new ApiError(400, "Invalid API Token");
    }

    return { token, providerId: model.provider.id, modelKey: model.modelKey };
  },

  async streamChat({
    type,
    prompt,
    modelId,
    conversationId,
    userId,
    id,
    onStart,
    onChunk,
    onEnd,
  }: streamChatProps) {
    // If edit or retry get last used model
    let lastMessage;
    if (type === "edit" || type === "retry") {
      if (id) {
        lastMessage = await prisma.conversationMessages.findFirst({
          where: { conversationId, userId, status: "ACTIVE", deletedAt: null },
          skip: type === "edit" ? 1 : 0,
          select: { id: true, modelId: true, role: true, message: true },
          orderBy: { createdAt: "desc" },
        });

        if (lastMessage && lastMessage.id === id) {
          modelId = lastMessage.modelId;
        } else throw new ApiError(400, "Invalid Id");
      } else throw new ApiError(400, "Invalid Id");
    }

    const { token, providerId, modelKey } = await this.getApiToken(modelId, userId);

    let conversationMessage;
    // If edit or retry delete the last message
    if (type === "edit" || type === "retry") {
      if (id && lastMessage?.role === "ASSISTANT") {
        try {
          await this.deleteConversationMessage(id, userId);
        } catch {
          throw new ApiError(400, "Invalid Id");
        }
      }

      if (type === "retry") {
        // Fetch last conversation message
        conversationMessage = await prisma.conversationMessages.findFirst({
          where: { conversationId, status: "ACTIVE" },
          select: { id: true, message: true, role: true },
          orderBy: { createdAt: "desc" },
        });

        // Check the last message and role
        if (!conversationMessage) {
          throw new ApiError(400, "Id is incorrect");
        }

        prompt = conversationMessage.message;
      }
    }

    // Check and create conversation
    if (!conversationId) {
      const coversationName = env.GENAI_TEST
        ? prompt.slice(0, 25)
        : await generateTitle(prompt, token);
      const coversation = await prisma.conversation.create({
        data: {
          name: coversationName ?? prompt.split(" ").slice(0, 10).join(" "),
          userId,
        },
        select: { id: true, name: true },
      });
      conversationId = coversation.id;
    }

    // Fetch past conversations
    const conversationMessages = await prisma.conversationMessages.findMany({
      where: { conversationId, status: "ACTIVE" },
      select: { id: true, message: true, role: true },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_MESSAGES,
    });

    // Create user conversation message
    if (!conversationMessage) {
      conversationMessage = await prisma.conversationMessages.create({
        data: {
          message: prompt,
          role: "USER",
          conversationId,
          providerId,
          modelId,
          userId,
          parentId:
            conversationMessages && conversationMessages.length > 0
              ? conversationMessages?.at(-1)?.id
              : null,
        },
        select: { id: true, message: true, role: true },
      });
      conversationMessages.push(conversationMessage);
    }

    // Prepare message history for send to ai
    const history = conversationMessages?.map((v) => ({
      role: v.role.toLowerCase(),
      parts: [{ text: v.message }],
    }));

    const usage = {
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
    let generatedContent = "";
    let outputConversationMessage;

    onStart();

    // Intimate to client "Coversation & Coversation message is created"
    onChunk("coversation", JSON.stringify({ id: conversationId }));

    try {
      // Generate ai stream
      const responseStream = await generateStream(history, modelKey, token);

      if (responseStream) {
        // Create assitent init message
        outputConversationMessage = await prisma.conversationMessages.create({
          data: {
            conversationId,
            message: "",
            role: "ASSISTANT",
            providerId,
            modelId,
            userId,
            parentId: conversationMessage.id,
          },
          select: { id: true, message: true, role: true, modelId: true },
        });

        if (env.GENAI_TEST) await new Promise((resolve) => setTimeout(resolve, 5000));

        // Retrive stream messages and send to client
        for await (const chunk of responseStream) {
          if (chunk.text) {
            generatedContent += chunk.text;
            onChunk("stream", chunk.text);
          }

          // Take usage tokens
          if (chunk.usageMetadata) {
            usage.promptTokens += chunk.usageMetadata.promptTokenCount || 0;
            usage.outputTokens += chunk.usageMetadata.candidatesTokenCount || 0;
            usage.totalTokens += chunk.usageMetadata.totalTokenCount || 0;
          }

          // Extract grounding metadata if available in the chunk or final response
          // const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
          // if (groundingMetadata) {
          //   console.log("--- Web Search Queries Used ---");
          //   console.log(groundingMetadata.webSearchQueries);

          //   console.log("--- Source Citations ---");
          //   if (groundingMetadata.groundingChunks) {
          //     for (const source of groundingMetadata.groundingChunks) {
          //       if (source.web) {
          //         console.log(`- Title: ${source.web.title}`);
          //         console.log(`  URL:   ${source.web.uri}`);
          //       }
          //     }
          //   }
          // }
        }
      }

      // If stream end, update streamed data to db
      await prisma.conversationMessages.update({
        data: {
          message: generatedContent,
          promptTokens: usage.promptTokens,
          outputTokens: usage.outputTokens,
        },
        where: {
          id: outputConversationMessage?.id,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          totalTokens: usage.totalTokens,
        },
      });
      onEnd();
    } catch (error) {
      if (error instanceof GenAIApiError) {
        onChunk(
          "error",
          JSON.stringify({ status: error.status, message: "An error occurred during streaming" }),
        );
      } else if (error instanceof ApiError) {
        onChunk("error", JSON.stringify({ status: error.statusCode, message: error.message }));
      } else {
        onChunk("error", JSON.stringify({ status: 500, message: "Internal server error" }));
      }
      onEnd();
      return;
    }
  },

  async conversationList(userId: string, { nextToken, pageSize, search }: PaginationType) {
    const whereCondition: Prisma.ConversationWhereInput = {
      userId,
      status: "ACTIVE",
      deletedAt: null,
    };
    if (search) {
      whereCondition.name = { contains: search, mode: "insensitive" };
    }

    const args: Prisma.ConversationFindManyArgs = {
      where: whereCondition,
      select: {
        id: true,
        name: true,
      },
      skip: 0,
      take: pageSize + 1,
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
    };

    if (nextToken) {
      try {
        const exist = await prisma.conversation.findFirst({ where: { id: nextToken } });
        if (!exist) throw new ApiError(400, "Invalid nextToken");
      } catch {
        throw new ApiError(400, "Invalid nextToken");
      }

      args.cursor = {
        id: nextToken,
      };
    }

    const data = await prisma.conversation.findMany(args);

    let nextId: string | undefined;
    if (data.length > pageSize) {
      nextId = data.at(-1)?.id;
      data.pop();
    }

    return { data, pageSize, nextToken: nextId };
  },

  async getConversation(conversationId: string) {
    const data = await prisma.conversation.findFirst({
      where: { id: conversationId, status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        name: true,
      },
    });

    return data;
  },

  async updateConversation(conversationId: string, name: string, userId: string) {
    try {
      const data = await prisma.conversation.update({
        where: { id: conversationId, userId, status: "ACTIVE" },
        data: { name },
        select: {
          id: true,
          name: true,
        },
      });
      return data;
    } catch {
      throw new ApiError(400, "Invalid Id");
    }
  },

  async deleteConversation(conversationId: string, userId: string) {
    try {
      const data = await prisma.conversation.update({
        where: { id: conversationId, userId },
        data: { status: "INACTIVE", deletedAt: new Date() },
        select: {
          id: true,
          name: true,
        },
      });

      return data;
    } catch {
      throw new ApiError(400, "Invalid Id");
    }
  },

  async conversationMessages(conversationId: string, { pageSize, nextToken }: PaginationType) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        name: true,
      },
    });

    if (!conversation) throw new ApiError(404, "Conversation not found");

    const args: Prisma.ConversationMessagesFindManyArgs = {
      where: {
        conversationId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
        message: true,
        role: true,
        modelId: true,
      },
      skip: 0,
      take: pageSize + 1,
      orderBy: {
        createdAt: "desc",
      },
    };

    if (nextToken) {
      try {
        const exist = await prisma.conversationMessages.findFirst({ where: { id: nextToken } });
        if (!exist) throw new ApiError(400, "Invalid nextToken");
      } catch {
        throw new ApiError(400, "Invalid nextToken");
      }

      args.cursor = {
        id: nextToken,
      };
    }
    const data = await prisma.conversationMessages.findMany(args);

    let nextId: string | undefined;
    if (data.length > pageSize) {
      nextId = data.at(-1)?.id;
      data.pop();
    }
    // data?.reverse();

    return { data, pageSize, nextToken: nextId };
  },

  async deleteConversationMessage(id: string, userId: string) {
    const message = await prisma.conversationMessages.update({
      where: { id, userId },
      data: { status: "INACTIVE", deletedAt: new Date() },
      select: {
        id: true,
        parentId: true,
      },
    });

    if (message) {
      await prisma.conversationMessages.updateMany({
        where: { parentId: message.id },
        data: { status: "INACTIVE", deletedAt: new Date() },
      });
    }

    return message;
  },
};
