import { ModelTypes, Prisma, Status, type Provider } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { updateProviderInput } from "../modules/apiToken.schema";
import { decryption, encryption } from "../utils/cryptoUtils";
import logger from "../utils/logger";
import { ApiError } from "../utils/api-error";
import type { ClientOptions } from "openai";
import OpenAI from "openai";
import type { JsonObject } from "@prisma/client/runtime/client";
import type { Page } from "openai/pagination";
import type { Model } from "openai/resources";

export const providerService = {
  async getProviders() {
    const providers = await prisma.provider.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
        models: {
          select: {
            id: true,
            modelName: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return providers;
  },

  async getModels(userId: string) {
    const models = await prisma.provider.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        status: true,
        apiTokens: {
          where: {
            deletedAt: null,
            userId,
          },
          select: {
            id: true,
            token: true,
            status: true,
          },
        },
        models: {
          where: {
            deletedAt: null,
            type: "TEXT",
          },
          select: {
            id: true,
            modelName: true,
            type: true,
            status: true,
          },
          orderBy: {
            modelName: "desc",
          },
        },
      },
    });

    return models.map((v) => ({
      ...v,
      status: v.apiTokens.length > 0 ? v.apiTokens[0]?.status : v.status,
      apiTokens: [],
    }));
  },

  async updateModelStatus(id: number, status: Status) {
    const model = await prisma.model.findUnique({ where: { id } });
    if (!model) throw new ApiError(400, "Invalid Id");

    await prisma.model.update({ where: { id }, data: { status } });
  },

  async updateProvider(id: number, input: updateProviderInput) {
    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new ApiError(400, "Invalid Id");

    let update: Prisma.ProviderUpdateInput = {};

    if (input.status) update["status"] = input.status;
    if (
      input.token &&
      ((input.status && input.status === "ACTIVE") ||
        (!input.status && provider.status === "ACTIVE"))
    ) {
      console.log("input.status", input.status);
      let aiConfig: ClientOptions = {
        apiKey: input.token,
      };
      if (provider.baseUrl) aiConfig["baseURL"] = provider.baseUrl;
      if (provider.headers && (provider.headers as JsonObject)) {
        aiConfig["defaultHeaders"] = provider.headers as Record<string, string>;
      }

      const ai = new OpenAI(aiConfig);
      try {
        await ai.models.list();
      } catch (err) {
        logger.error("Invalidate Api Key error", err);
        throw new ApiError(400, "Invalid Token");
      }

      update["token"] = encryption(input.token);
      console.log("update", update);
    }

    if (Object.keys(update).length > 0) {
      await prisma.provider.update({
        where: { id },
        data: update,
      });
    }
  },

  async syncModels(id: number) {
    const provider = await prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new ApiError(400, "Invalid Id");
    if (!provider.token) throw new ApiError(400, "Invalid Token. Update and try again.");
    if (provider.status != "ACTIVE") throw new ApiError(400, "Update status and try again.");

    let aiConfig: ClientOptions = {
      apiKey: decryption(provider.token),
    };
    if (provider.baseUrl) aiConfig["baseURL"] = provider.baseUrl;
    if (provider.headers && (provider.headers as JsonObject)) {
      aiConfig["defaultHeaders"] = provider.headers as Record<string, string>;
    }

    const ai = new OpenAI(aiConfig);
    let models: Page<Model> | null = null;
    try {
      models = await ai.models.list();
    } catch (err) {
      logger.error("Invalidate Api Key error", err);
      throw new ApiError(400, "Invalid Token. Update and try again.");
    }

    if (models) {
      await prisma.model.updateMany({
        where: {
          providerId: provider.id,
          status: "ACTIVE",
        },
        data: { status: "INACTIVE" },
      });

      for await (const model of models.data) {
        if (!model.id) continue;
        const name = model.id.toLowerCase();

        let type;
        // filter out non-stable strings
        if (
          name.includes("experimental") ||
          name.includes("-exp") ||
          name.includes("preview") ||
          name.includes("tunedmodels") ||
          name.includes("deprecated") ||
          name.includes("legacy") ||
          name.includes("-latest") ||
          name.includes("gemma") ||
          name.includes("embedding") ||
          name.includes("-search") ||
          /-\d{4}/.test(name)
        )
          continue;

        // filter gemini/gpt no needed models
        if (
          (provider.id == 1 && name.includes("gemini-2")) ||
          name.includes("aqa") ||
          name.includes("live")
        ) {
          continue;
        } else if (
          provider.id == 2 &&
          (name.includes("chatgpt-") ||
            name.includes("-pro") ||
            name.includes("-codex") ||
            name.includes("davinci") ||
            name.includes("o1") ||
            name.includes("o2") ||
            name.includes("o3") ||
            name.includes("o4"))
        ) {
          continue;
        }

        if (name.includes("video") || name.includes("omni") || name.includes("sora")) {
          type = ModelTypes.VIDEO;
        } else if (
          name.includes("imagen") ||
          name.includes("-image") ||
          name.includes("-banana") ||
          name.includes("dall-e-")
        ) {
          type = ModelTypes.IMAGE;
        } else if (
          name.includes("audio") ||
          name.includes("lyria") ||
          name.includes("realtime") ||
          name.includes("transcribe") ||
          name.includes("speech") ||
          name.includes("voice") ||
          name.includes("-tts") ||
          name.includes("whisper")
        ) {
          type = ModelTypes.AUDIO;
        } else {
          type = ModelTypes.TEXT;
        }

        // currently migrate text models only
        if (type == ModelTypes.TEXT) {
          const data = {
            modelKey: model.id.replace(/^models\//, ""),
            modelName: (model as { display_name?: string }).display_name || model.id,
            providerId: id,
            type: type || ModelTypes.TEXT,
            status: Status.ACTIVE,
          };
          const existModel = await prisma.model.findUnique({ where: { modelKey: data.modelKey } });

          if (existModel) {
            await prisma.model.update({ where: { modelKey: data.modelKey }, data });
          } else {
            await prisma.model.create({ data });
          }
        }
      }
    }
  },
};
