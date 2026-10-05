import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import logger from "./utils/logger";

const createServer = async () => {
  try {
    await prisma.$connect();
    logger.info("Database Connected");

    const server = app.listen(env.PORT, () =>
      logger.info(`Server running on http://localhost:${env.PORT}`),
    );

    const shutdown = async () => {
      logger.info("Shutting down server...");

      server.close(async () => {
        await prisma.$disconnect();
        logger.info("Databse disconnected");

        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);

    await prisma.$disconnect();
    process.exit(1);
  }
};

createServer();
