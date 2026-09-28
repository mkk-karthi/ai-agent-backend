import dotenv from "dotenv";
import { execSync } from "node:child_process";
import { prisma } from "../src/config/prisma";
import { afterAll } from "@jest/globals";

dotenv.config({
  path: ".env.test",
});

// process.env.NODE_ENV = "test";

// console.log("DATABASE_URL", process.env.DATABASE_URL);

execSync(`DATABASE_URL="${process.env.DATABASE_URL}" npx prisma migrate deploy && prisma db seed`, {
  stdio: "inherit",
  env: process.env,
});

afterAll(async () => {
  await prisma.$disconnect();
});
