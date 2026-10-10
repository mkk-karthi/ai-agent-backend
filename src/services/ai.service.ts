import OpenAI from "openai";
import { prisma } from "../config/prisma";
import { decryption } from "../utils/cryptoUtils";
import { ApiError } from "../utils/api-error";
import type { ClientOptions } from "openai";
import logger from "../utils/logger";
import type { GenerateOptions, ToolDefinition } from "../types/ai.types";
import aiTools from "../utils/ai-tools";
import { JsonObject } from "@prisma/client/runtime/client";
import { env } from "../config/env";

const baseDelayMs = 1000;

export class AiService {
  private ai: OpenAI | undefined;
  private modelId;
  private modelKey = "";
  private userId;
  private providerId = 1;

  constructor(modelId: number, userId: string) {
    this.modelId = modelId;
    this.userId = userId;
  }

  async init() {
    const model = await prisma.model.findFirst({
      where: { id: this.modelId, status: "ACTIVE" },
      select: {
        id: true,
        modelKey: true,
        providerId: true,
        provider: {
          select: {
            id: true,
            baseUrl: true,
            headers: true,
            apiTokens: {
              where: {
                userId: this.userId,
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
    if (!apiToken) {
      throw new ApiError(400, "No active API token");
    }

    // Decrypt token
    let token = "";
    try {
      token = decryption(apiToken.token ?? "");
    } catch {
      throw new ApiError(400, "Invalid API Token");
    }

    this.modelKey = model.modelKey;
    this.providerId = model.providerId;

    let aiConfig: ClientOptions = {
      apiKey: token,
    };
    if (model.provider.baseUrl) aiConfig["baseURL"] = model.provider.baseUrl;
    if (model.provider.headers && (model.provider.headers as JsonObject)) {
      aiConfig["defaultHeaders"] = model.provider.headers as Record<string, string>;
    }

    this.ai = new OpenAI(aiConfig);

    if (apiToken.status !== "ACTIVE") {
      const valid = await this.validateApiKey();
      if (valid) {
        await prisma.apiToken.update({ where: { id: apiToken.id }, data: { status: "ACTIVE" } });
      } else {
        throw new ApiError(400, "No active API token");
      }
    }

    return { providerId: this.providerId, modelKey: this.modelKey };
  }

  async validateApiKey(): Promise<boolean> {
    if (!this.ai) throw new ApiError(500, "Provider not initiate");

    try {
      await this.ai.models.list();
      return true;
    } catch (err) {
      logger.error("Invalidate Api Key error", err);
      return false;
    }
  }

  generateTools(tools: GenerateOptions["tools"]) {
    const toolList: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
    if (tools && tools.webSearch) {
      toolList.push({
        type: "function",
        function: {
          name: aiTools.webSearchTool.name,
          description: aiTools.webSearchTool.description,
          parameters: aiTools.webSearchTool.parameters,
        },
      });
    }
    return toolList;
  }

  buildMessages(options: GenerateOptions) {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: "system",
        content: options.systemPrompt,
      });
    }

    for (const message of options.messages) {
      messages.push({
        role: message.role,
        content: message.content,
      });
    }
    return messages;
  }

  async errorHandling(error: any, attempt: number, maxRetries: number, delayMs: number) {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    logger.error(error.message, error);

    if (error instanceof OpenAI.APIError) {
      const message = error.message;
      const status = error.status;
      const errorCode = error.code;
      const errorType = error.type;
      const requestID = error.requestID;
      const retryAfterMs = error.headers.get("retry-after");

      // Network Timeout (408)
      if (
        status === 408 ||
        error instanceof OpenAI.APIConnectionTimeoutError ||
        ["timeout", "timed out", "etimedout", "econnreset"].includes(message.toLowerCase())
      ) {
        logger.warn(`Timeout error (408). Retrying in Attempt ${attempt}/${maxRetries})`);
        if (attempt < maxRetries) {
          return { retry: true, delayMs };
        } else {
          throw new ApiError(
            400,
            `[408 Timeout error] The AI provider request timed out. Please try again.`,
            "TIMEOUT",
          );
        }
      }

      // RATE LIMITS & QUOTA EXCEEDED (429)
      if (status === 429) {
        const quotaError = [
          "quota",
          "insufficient_quota",
          "billing",
          "credit",
          "exceeded your current quota",
          "exceeded quota",
        ].includes(`${message} ${errorType} ${errorCode}`.toLowerCase());

        if (quotaError) {
          throw new ApiError(
            400,
            "[429] Monthly quota or billing limit reached. Upgrade your plan at Google AI Studio or check billing status.",
            "QUOTA_EXCEEDED",
          );
        }

        // Temporary RPM/TPM Rate Limit
        if (attempt < maxRetries) {
          const waitTime = retryAfterMs ?? Math.pow(2, attempt) * (baseDelayMs * 2);
          logger.warn(
            `[429 Rate Limit] Backing off for ${waitTime}ms... (Attempt ${attempt}/${maxRetries})`,
          );
          await wait(waitTime);
          return { retry: true, delayMs };
        } else {
          throw new ApiError(
            400,
            `[429] AI provider rate limit exceeded. Please retry after a short delay.`,
            "RATE_LIMIT",
          );
        }
      }

      // PERMISSIONS (401)
      if (status === 401) {
        throw new ApiError(
          400,
          "[401] Authentication failed. Verify that API key is valid.",
          "AUTHENTICATION",
        );
      }

      // AUTHENTICATION (403)
      if (status === 403) {
        throw new ApiError(
          400,
          "[403] Permission denied. Verify that API key has access to requested features.",
          "PERMISSION_DENIED",
        );
      }

      // DEPRECATED / NOT FOUND MODEL (404)
      if (status === 404) {
        throw new ApiError(
          400,
          `[404 Model Not Found] ${this.modelKey} is deprecated or unavailable. Switching model...`,
          "MODEL_NOT_FOUND",
        );
      }

      if (status === 400) {
        const contextLimit = [
          "context length",
          "context window",
          "maximum context",
          "too many tokens",
          "token limit",
          "max tokens",
          "input is too long",
          "prompt is too long",
          "context_length_exceeded",
        ].includes(`${message} ${errorType} ${errorCode}`.toLowerCase());

        if (contextLimit) {
          throw new ApiError(
            400,
            "[400] Input prompt exceeds maximum allowed context length.",
            "CONTEXT_LIMIT",
          );
        }

        const unsupportedFeature = [
          "not supported",
          "unsupported",
          "does not support",
          "feature",
          "tool",
          "function calling",
        ].includes(`${message} ${errorType} ${errorCode}`.toLowerCase());

        if (unsupportedFeature) {
          throw new ApiError(
            400,
            `[400] The requested feature or parameter is not supported by ${this.modelKey}.`,
            "FEATURE_NOT_SUPPORTED",
          );
        }

        throw new ApiError(400, `[400] The AI request is invalid.`, "INVALID_REQUEST");
      }

      // HIGH DEMAND / SERVER OVERLOAD (503)
      if (status === 500 || status === 502 || status === 503 || status === 504) {
        if (attempt < maxRetries) {
          logger.warn(
            `Provider overloaded (503). Retrying in ${delayMs}ms... (Attempt ${attempt}/${maxRetries})`,
          );
          await wait(retryAfterMs ?? delayMs);
          delayMs *= 2;
          return { retry: true, delayMs };
        } else {
          throw new ApiError(
            400,
            `[503 Server Busy] ${this.modelKey} failed all retries. Falling back to next model...`,
            "SERVER_OVERLOAD",
          );
        }
      }

      // Connection/network failure.
      if (
        error instanceof OpenAI.APIConnectionError ||
        [
          "network error",
          "fetch failed",
          "socket hang up",
          "connection refused",
          "connection reset",
          "econnrefused",
          "enotfound",
        ].includes(message.toLowerCase())
      ) {
        if (attempt < maxRetries) {
          logger.warn(
            `Provider not connected (503). Retrying in ${delayMs}ms... (Attempt ${attempt + 1}/${maxRetries})`,
          );
          await wait(retryAfterMs ?? delayMs);
          delayMs *= 2;
          return { retry: true, delayMs };
        } else {
          throw new ApiError(
            400,
            `[503 Network Error] Unable to connect to the AI provider. Please try again.`,
            "NETWORK_ERROR",
          );
        }
      }
    }
    return { retry: false, delayMs };
  }

  async callTool(
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall,
  ): Promise<{ toolExecuted?: any; message: OpenAI.Chat.Completions.ChatCompletionMessageParam }> {
    const rawName = toolCall.function.name || "";
    const cleanName = rawName.includes(":") ? rawName.split(":").pop()! : rawName;

    const tool = Object.values(aiTools).find(
      (item: ToolDefinition) => item.name === cleanName || item.name === rawName,
    );

    const toolCallId = toolCall.id || `call_${Date.now()}`;

    if (!tool) {
      return {
        message: {
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify({
            error: `Unknown tool: ${rawName}`,
          }),
        },
      };
    }

    // Parse tool args
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments || "{}");
    } catch {
      logger.error(`Invalid tool arguments`, toolCall);
      return {
        message: {
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify({
            error: "Invalid tool arguments.",
          }),
        },
      };
    }

    try {
      const result = await tool.execute(args);

      return {
        message: {
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
        },
        toolExecuted: {
          tool_call_id: toolCallId,
          name: tool.name,
          arguments: args,
          result,
        },
      };
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Unknown error occurred.", error);
      return {
        message: {
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error occurred.",
          }),
        },
      };
    }
  }

  async generate(options: GenerateOptions, maxRetries = 3) {
    if (!this.ai) throw new ApiError(500, "Provider not initiate");

    const toolCallsExecuted: unknown[] = [];
    let lastMessageId = options.lastMessageId;

    // prepare messages and tools
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      this.buildMessages(options);
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = this.generateTools(options.tools);

    // Prevant max tool calling timws
    for (let round = 0; round < env.MAX_TOOL_TIMES; round++) {
      // Prevant tool calling rounds
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let delay = 2000;

        logger.info("messages", messages);

        try {
          // Send initial prompt to check if tool is needed
          const completion = await this.ai.chat.completions.create({
            model: this.modelKey,
            messages: messages,
            temperature: options.temperature ?? env.DEFAULT_TEMPERATURE,
            max_tokens: options.maxTokens ?? env.DEFAULT_MAX_TOKENS,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? "auto" : undefined,
          });

          logger.info("completion", completion);

          const choice = completion.choices[0];
          if (!choice) {
            throw new ApiError(500, "AI provider returned no choices.", "UNKNOWN");
          }

          const assistantMessage = choice.message;
          messages.push(assistantMessage);

          const toolCalls = assistantMessage.tool_calls ?? [];
          logger.info("toolCalls", toolCalls);

          // If tool not triggered return response
          if (toolCalls.length === 0) {
            if (choice.finish_reason === "length" && !assistantMessage.content) {
              logger.warn(
                "AI completion finished with reason 'length' and empty content. maxTokens might be too low.",
              );
            }
            return {
              content: assistantMessage.content ?? "",
              usage: {
                promptTokens: completion.usage?.prompt_tokens,
                completionTokens: completion.usage?.completion_tokens,
                totalTokens: completion.usage?.total_tokens,
              },
              toolCalls: toolCallsExecuted,
              messages,
            };
          }

          // Create tool calling message
          if (!lastMessageId) {
            const lastMessage = await prisma.conversationMessages.findFirst({
              where: {
                conversationId: options.conversationId,
                userId: this.userId,
              },
              skip: 1,
              orderBy: { createdAt: "desc" },
            });
            lastMessageId = lastMessage ? lastMessage.id : lastMessageId;
          }

          // Update usage details
          const outputMessage = await prisma.conversationMessages.create({
            data: {
              conversationId: options.conversationId ?? "",
              message: assistantMessage.content ?? "",
              role: "ASSISTANT",
              providerId: this.providerId,
              modelId: this.modelId,
              userId: this.userId,
              parentId: lastMessageId || null,
              toolCalls: JSON.stringify(toolCalls),
              status: "DRAFT",
            },
            select: { id: true, message: true, role: true, modelId: true },
          });
          lastMessageId = outputMessage ? outputMessage.id : lastMessageId;

          await prisma.tokenUsage.createMany({
            data: [
              {
                conversationMessageId: outputMessage.id,
                modelId: this.modelId,
                userId: this.userId,
                promptTokens: completion.usage?.prompt_tokens,
                outputTokens: completion.usage?.completion_tokens,
                totalTokens: completion.usage?.total_tokens,
              },
            ],
          });

          // Check if a tool was triggered, execute and send data back
          for (const toolCall of toolCalls) {
            if (toolCall.type !== "function") {
              continue;
            }
            logger.info("toolCall", toolCall.function);
            const { toolExecuted, message } = await this.callTool(toolCall);
            messages.push(message);
            if (toolExecuted) toolCallsExecuted.push(toolExecuted);

            logger.info("toolExecuted", toolExecuted);
            logger.info("message", message);

            // Create tool response message
            const toolMessage = await prisma.conversationMessages.create({
              data: {
                conversationId: options.conversationId ?? "",
                message: (messages[messages.length - 1]?.content as string) || "",
                role: "TOOL",
                providerId: this.providerId,
                modelId: this.modelId,
                userId: this.userId,
                parentId: lastMessageId || null,
                toolCalls: JSON.stringify(toolCallsExecuted),
                status: "DRAFT",
              },
              select: { id: true, message: true, role: true, modelId: true },
            });
            lastMessageId = toolMessage ? toolMessage.id : lastMessageId;
          }
        } catch (error) {
          const { retry, delayMs } = await this.errorHandling(error, attempt, maxRetries, delay);
          delay = delayMs;

          if (retry) continue;

          // UNHANDLED / UNKNOWN ERRORS
          throw new ApiError(500, `An error occurred during streaming`);
        }
      }
    }
    throw new ApiError(400, "Maximum tool execution rounds exceeded.", "TOOL_ERROR");
  }

  async stream(options: GenerateOptions, maxRetries = 3) {
    if (!this.ai) throw new ApiError(500, "Provider not initiate");

    const toolCallsExecuted: unknown[] = [];
    let lastMessageId = options.lastMessageId;

    // prepare messages and tools
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      this.buildMessages(options);
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = this.generateTools(options.tools);

    // Prevant max tool calling timws
    for (let round = 0; round < env.MAX_TOOL_TIMES; round++) {
      // Prevant tool calling rounds
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let delay = 2000;

        const usage = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        };
        let content = "";
        const toolCalls = new Map<number, any>();

        logger.info("messages", messages);

        try {
          // Send initial prompt to check if tool is needed
          const stream = await this.ai.chat.completions.create({
            model: this.modelKey,
            messages,
            temperature: options.temperature ?? env.DEFAULT_TEMPERATURE,
            max_tokens: options.maxTokens ?? env.DEFAULT_MAX_TOKENS,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? "auto" : undefined,
            stream: true,
            stream_options: { include_usage: true },
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (!delta) {
              continue;
            }

            // Stream text if the model responds directly without a tool
            if (delta.content) {
              content += delta.content;
              options.onChunk?.(delta.content);
            }

            // Capture streaming tool calls
            if (delta.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.type !== "function") {
                  continue;
                }

                const index = toolCall.index;
                const existing = toolCalls.get(index);

                if (!existing) {
                  toolCalls.set(index, toolCall);
                } else {
                  if (toolCall.id && !existing.id) existing.id = toolCall.id;
                  if (toolCall.function?.name) existing.function.name = toolCall.function.name;
                  if (toolCall.function?.arguments)
                    existing.function.arguments += toolCall.function.arguments;
                }
              }
            }
            if (chunk.usage) {
              usage.promptTokens = chunk.usage.prompt_tokens || 0;
              usage.completionTokens = chunk.usage.completion_tokens || 0;
              usage.totalTokens = chunk.usage.total_tokens || 0;
            }
          }

          logger.info("content", content);
          logger.info("usage", usage);
          logger.info("toolCalls", toolCalls);

          if (toolCalls.size > 0) {
            messages.push({
              role: "assistant",
              content: content || "",
              tool_calls: Array.from(toolCalls.values()),
            });

            // Create tool calling message
            if (!lastMessageId) {
              const lastMessage = await prisma.conversationMessages.findFirst({
                where: {
                  conversationId: options.conversationId,
                  userId: this.userId,
                },
                skip: 1,
                orderBy: { createdAt: "desc" },
              });
              lastMessageId = lastMessage ? lastMessage.id : lastMessageId;
            }

            // Update usage details
            const outputMessage = await prisma.conversationMessages.create({
              data: {
                conversationId: options.conversationId ?? "",
                message: content,
                role: "ASSISTANT",
                providerId: this.providerId,
                modelId: this.modelId,
                userId: this.userId,
                parentId: lastMessageId || null,
                toolCalls: JSON.stringify(Array.from(toolCalls.values())),
                status: "DRAFT",
              },
              select: { id: true, message: true, role: true, modelId: true },
            });
            lastMessageId = outputMessage ? outputMessage.id : lastMessageId;

            await prisma.tokenUsage.createMany({
              data: [
                {
                  conversationMessageId: outputMessage.id,
                  modelId: this.modelId,
                  userId: this.userId,
                  promptTokens: usage.promptTokens,
                  outputTokens: usage.completionTokens,
                  totalTokens: usage.totalTokens,
                },
              ],
            });

            for (const toolCall of Array.from(toolCalls.values())) {
              if (toolCall.type !== "function") {
                continue;
              }

              const { toolExecuted, message } = await this.callTool(toolCall);

              messages.push(message);
              if (toolExecuted) toolCallsExecuted.push(toolExecuted);

              logger.info("toolExecuted", toolExecuted);
              logger.info("message", message);

              // Create tool response message
              const toolMessage = await prisma.conversationMessages.create({
                data: {
                  conversationId: options.conversationId ?? "",
                  message: (message.content || "") as string,
                  role: "TOOL",
                  providerId: this.providerId,
                  modelId: this.modelId,
                  userId: this.userId,
                  parentId: lastMessageId || null,
                  status: "DRAFT",
                  toolCalls: JSON.stringify(toolCallsExecuted),
                },
                select: { id: true, message: true, role: true, modelId: true },
              });
              lastMessageId = toolMessage ? toolMessage.id : lastMessageId;
            }
          } else {
            return { usage, content, toolCalls: toolCallsExecuted, messages, lastMessageId };
          }
        } catch (error) {
          const { retry, delayMs } = await this.errorHandling(error, attempt, maxRetries, delay);
          delay = delayMs;

          if (retry) continue;

          // UNHANDLED / UNKNOWN ERRORS
          throw new ApiError(500, `An error occurred during streaming`);
        }
      }
    }

    throw new ApiError(400, "Maximum tool execution rounds exceeded.", "TOOL_ERROR");
  }
}
