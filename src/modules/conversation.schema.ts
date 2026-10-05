import z from "zod";
import { prisma } from "../config/prisma";

export const chatSchema = z
  .object({
    prompt: z
      .string()
      .min(1, "prompt is required")
      .transform((v) => v.trim()),
    modelId: z.number().refine(async (val) => {
      try {
        const exists = await prisma.model.findFirst({ where: { id: val } });
        return !!exists;
      } catch {
        return false;
      }
    }, "The selected model is invalid"),
    conversationId: z
      .string()
      .refine(async (val) => {
        if (val) {
          try {
            const exists = await prisma.conversation.findFirst({ where: { id: val } });
            return !!exists;
          } catch {
            return false;
          }
        } else return true;
      }, "The selected conversation id is invalid")
      .optional(),
    id: z.string().optional(),
  })
  .refine(
    async (data) => {
      if (data.id) {
        if (data.conversationId) {
          try {
            const exists = await prisma.conversationMessages.findFirst({
              where: { id: data.id, conversationId: data.conversationId },
            });
            return !!exists;
          } catch {
            return false;
          }
        } else return true;
      } else return true;
    },
    {
      message: "The selected id is invalid",
      path: ["id"],
    },
  );

export const retryChatSchema = z
  .object({
    conversationId: z
      .string()
      .refine(async (val) => {
        if (val) {
          try {
            const exists = await prisma.conversation.findFirst({ where: { id: val } });
            return !!exists;
          } catch {
            return false;
          }
        } else return true;
      }, "The selected conversation id is invalid"),
    id: z.string(),
  })
  .refine(
    async (data) => {
      if (data.id) {
        if (data.conversationId) return true;
        else return false;
      }
    },
    {
      message: "Conversation id is required",
      path: ["conversationId"],
    },
  )
  .refine(
    async (data) => {
      if (data.id) {
        if (data.conversationId) {
          try {
            const exists = await prisma.conversationMessages.findFirst({
              where: { id: data.id, conversationId: data.conversationId },
            });
            return !!exists;
          } catch {
            return false;
          }
        } else return true;
      } else return true;
    },
    {
      message: "The selected id is invalid",
      path: ["id"],
    },
  );

export type chatInput = z.infer<typeof chatSchema>;
export type retryChatInput = z.infer<typeof retryChatSchema>;
