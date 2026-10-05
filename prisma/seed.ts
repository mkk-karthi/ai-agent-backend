import { ModelTypes, Status, type Model, type Prisma } from "@prisma/client";
import { env } from "../src/config/env";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { GoogleGenAI } from "@google/genai";

const seedGeminiModels = async (id: number) => {
  const gemini = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
  });

  const modelsList = await gemini.models.list();
  const models: Prisma.ModelCreateManyInput[] = [];

  await prisma.model.updateMany({
    where: {
      status: "ACTIVE",
    },
    data: { status: "INACTIVE" },
  });

  for await (const model of modelsList) {
    const actions = model.supportedActions ?? [];
    if (!model.name || !actions.includes("generateContent")) continue;
    const name = model.name.toLowerCase();

    // filter out non-stable strings
    if (
      name.includes("experimental") ||
      name.includes("-exp") ||
      name.includes("preview") ||
      name.includes("tunedmodels")
    )
      continue;
    if (
      name.includes("gemini-2") ||
      name.includes("-tts") ||
      name.includes("-latest") ||
      name.includes("transcribe") ||
      name.includes("gemma")
    )
      continue;

    let type;
    if (name.includes("video") || name.includes("omni")) {
      type = ModelTypes.VIDEO;
      continue;
    } else if (name.includes("imagen") || name.includes("-image")) {
      type = ModelTypes.IMAGE;
      continue;
    } else if (name.includes("audio") || name.includes("lyria")) {
      type = ModelTypes.AUDIO;
      continue;
    } else {
      type = ModelTypes.TEXT;
    }

    const data = {
      modelKey: model.name.replace(/^models\//, ""),
      modelName: model.displayName ?? model.name,
      providerId: id,
      inputTokenLimit: model.inputTokenLimit ?? 0,
      outputTokenLimit: model.outputTokenLimit ?? 0,
      type,
      // actions,
    };
    const existModel = await prisma.model.findUnique({ where: { modelKey: data.modelKey } });

    if (existModel) {
      await prisma.model.update({ where: { modelKey: data.modelKey }, data });
    } else {
      await prisma.model.create({ data });
    }
  }
  console.log("Seeding gemini models");
};

const main = async () => {
  const password = await hashPassword("Admin@123");

  await prisma.user.upsert({
    where: {
      email: "admin@gmail.com",
    },
    update: {},
    create: {
      email: "admin@gmail.com",
      password,
      firstName: "admin",
      role: "ADMIN",
      authProvider: "LOCAL",
      mailVerifiedAt: new Date(),
    },
  });

  const gemini = await prisma.provider.upsert({
    where: {
      name: "gemini",
    },
    update: {},
    create: {
      name: "gemini",
    },
    select: { id: true },
  });
  await seedGeminiModels(gemini.id);

  console.log("Seeding done");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
