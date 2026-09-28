import { execSync } from "node:child_process";
import { prisma } from "../../src/config/prisma";
import { afterAll } from "@jest/globals";

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: process.env,
});

afterAll(async () => {
  await prisma.user.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.$disconnect();
});
