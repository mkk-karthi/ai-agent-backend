import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";

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

  await prisma.provider.upsert({
    where: {
      id: 1,
    },
    update: {},
    create: {
      name: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    },
    select: { id: true },
  });

  await prisma.provider.upsert({
    where: {
      id: 2,
    },
    update: {},
    create: {
      name: "openai",
      status: "INACTIVE",
    },
    select: { id: true },
  });

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
