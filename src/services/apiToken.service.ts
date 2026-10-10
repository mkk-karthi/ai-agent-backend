import { Prisma, Status } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { apiTokenInput, tokenUsageInput } from "../modules/apiToken.schema";
import { encryption } from "../utils/cryptoUtils";
import { AiService } from "./ai.service";
import logger from "../utils/logger";

interface tokenUsageResult {
  date: Date;
  totalTokens: number;
}

export const apiTokenService = {
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

    let apiToken = await prisma.apiToken.upsert({
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
        provider: {
          select: {
            models: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (apiToken.provider?.models[0]?.id) {
      try {
        const aiProvider = new AiService(apiToken.provider.models[0].id, userId);
        await aiProvider.init();

        apiToken = await prisma.apiToken.update({
          where: {
            id: apiToken.id,
          },
          data: {
            status: (status = Status.ACTIVE),
          },
          select: {
            id: true,
            providerId: true,
            userId: true,
            token: true,
            status: true,
            provider: {
              select: {
                models: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });
      } catch (err) {
        logger.error("Validate token error", err);
      }
    }

    return apiToken;
  },

  async getUsageTokens({ type, limit, userId }: tokenUsageInput) {
    let select = Prisma.empty;
    let where = Prisma.empty;

    if (type === "day") {
      select = Prisma.sql`SELECT DATE_TRUNC('day', "createdAt") AS date, SUM("totalTokens")::INT AS "totalTokens"`;
    } else if (type === "week") {
      select = Prisma.sql`SELECT DATE_TRUNC('week', "createdAt") AS date, SUM("totalTokens")::INT AS "totalTokens"`;
    }

    if (userId) {
      where = Prisma.sql`WHERE "userId" = ${userId}`;
    }

    if (select) {
      let usages: tokenUsageResult[] =
        await prisma.$queryRaw`${select} FROM "token_usage" ${where} GROUP BY date ORDER BY date DESC LIMIT ${limit};`;

      let data: { text: string; total: number; date: string }[] = [];
      const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

      // fill empty dates
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      if (type == "week") {
        // set monday
        d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1) + 7);
        // d.setDate(d.getDate() + 7);
      } else d.setDate(d.getDate() + 1);

      for (let i = 0; i < limit; i++) {
        if (type == "week") d.setDate(d.getDate() - 7);
        else d.setDate(d.getDate() - 1);

        let usage = usages.find((v) => v.date.toISOString() === d.toISOString());

        if (usage) {
          data.push({
            text: (i + 1).toString(),
            date: formatter.format(usage.date).toUpperCase(),
            total: usage.totalTokens,
          });
        } else {
          data.push({
            text: (i + 1).toString(),
            date: formatter.format(d).toUpperCase(),
            total: 0,
          });
        }
      }

      data.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

      return data.map((v) => ({ label: v.date, value: v.total }));
    } else {
      return { data: [], labels: [] };
    }
  },

  async getProviderUsage(providerId: number) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        _count: {
          select: {
            apiTokens: {
              where: {
                status: "ACTIVE",
                providerId,
                provider: { status: "ACTIVE" },
              },
            },
          },
        },
      },
      where: {
        status: "ACTIVE",
      },
    });
    const result = users.reduce(
      (res, item) => ({
        active: item._count.apiTokens > 0 ? res.active + 1 : res.active,
        inactive: item._count.apiTokens == 0 ? res.inactive + 1 : res.inactive,
      }),
      { active: 0, inactive: 0 },
    );

    return result;
  },

  async getModelUsage(providerId: number) {
    const result = await prisma.model.findMany({
      select: {
        id: true,
        modelName: true,
        _count: {
          select: {
            tokenUsages: true,
          },
        },
      },
      where: {
        status: "ACTIVE",
        providerId,
      },
      orderBy: {
        modelName: "asc",
      },
    });

    return result.map((v) => ({ label: v.modelName, value: v._count.tokenUsages }));
  },
};
