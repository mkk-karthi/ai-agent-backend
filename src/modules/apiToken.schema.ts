import z from "zod";
import { prisma } from "../config/prisma";

export const apiTokenSchema = z.object({
  providerId: z.number().refine(async (val) => {
    const exists = await prisma.provider.findFirst({ where: { id: val } });
    return !!exists;
  }, "The selected provider is invalid"),
  token: z.string(),
});

export type apiTokenInput = z.infer<typeof apiTokenSchema>;
