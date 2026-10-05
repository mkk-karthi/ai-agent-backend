import { Status } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { apiTokenInput } from "../modules/apiToken.schema";
import { encryption } from "../utils/cryptoUtils";
import { validateApiKey } from "../utils/gemini";

export const apiTokenService = {
  async getProviders() {
    const providers = await prisma.provider.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
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
    }));
  },

  async getApiTokens(userId: string) {
    const models = await prisma.provider.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
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
      },
    });

    return models;
  },

  async updateApiToken(input: apiTokenInput, userId: string) {
    const token = input.token ? encryption(input.token) : null;

    let status: Status = Status.INACTIVE;

    if (input.providerId === 1) {
      const validToken = await validateApiKey(input.token);
      if (validToken) status = Status.ACTIVE;
      else status = Status.INACTIVE;
    }

    const providers = await prisma.apiToken.upsert({
      where: {
        providerId_userId: {
          providerId: input.providerId,
          userId: userId,
        },
      },
      create: {
        providerId: input.providerId,
        userId: userId,
        token,
        status,
        createdBy: userId,
      },
      update: {
        token,
        status,
      },
      select: {
        id: true,
        providerId: true,
        userId: true,
        token: true,
        status: true,
      },
    });

    return providers;
  },

  async getModelById(id: number) {
    const model = await prisma.model.findFirst({
      where: { id },
      select: {
        id: true,
        modelKey: true,
        modelName: true,
        type: true,
        status: true,
        deletedAt: true,
      },
    });
    return model;
  },

  async getModelByKey(key: string) {
    const model = await prisma.model.findFirst({
      where: { modelKey: key },
      select: {
        id: true,
        modelKey: true,
        modelName: true,
        type: true,
        status: true,
        deletedAt: true,
      },
    });
    return model;
  },
};
