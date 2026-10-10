import z from "zod";
import { prisma } from "../config/prisma";
import { Status } from "@prisma/client";

export const apiTokenSchema = z.object({
  providerId: z.number().refine(async (val) => {
    const exists = await prisma.provider.findFirst({ where: { id: val } });
    return !!exists;
  }, "The selected provider is invalid"),
  token: z.string(),
});

export const tokenUsageSchema = z.object({
  type: z.enum(["day", "week"], "Type is invalid"),
  limit: z.coerce.number().int().positive().max(10, "Type is not be greater than 10").default(4),
  userId: z.string().optional(),
});

export const updateProviderSchema = z
  .object({
    token: z.string().transform((v) => v.trim()),
    status: z.enum(Status),
  })
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Either token or status must be provided",
    path: [],
  });

export const updateModelSchema = z.object({
  status: z.enum(Status),
});

export type apiTokenInput = z.infer<typeof apiTokenSchema>;
export type tokenUsageInput = z.infer<typeof tokenUsageSchema>;
export type updateProviderInput = z.infer<typeof updateProviderSchema>;
export type updateModelInput = z.infer<typeof updateModelSchema>;
