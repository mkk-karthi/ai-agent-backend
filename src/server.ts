import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const createServer = async () => {
  try {
    await prisma.$connect();
    console.log("Database Connected");

    const server = app.listen(env.PORT, () =>
      console.log(`Server running on http://localhost:${env.PORT}`),
    );

    const shutdown = async () => {
      console.log("Shutting down server...");

      server.close(async () => {
        await prisma.$disconnect();
        console.log("Databse disconnected");

        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);

    await prisma.$disconnect();
    process.exit(1);
  }
};

createServer();
