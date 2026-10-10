import type { Request, RequestHandler } from "express";
import { ApiError } from "../utils/api-error";
import { verifyAccessToken } from "../utils/jwt";
import logger from "../utils/logger";
import { prisma } from "../config/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const authenticate: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    logger.warn("Authorization is required");
    next(new ApiError(401, "Unauthorized"));
    return;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    logger.warn("Invalid Token format");
    next(new ApiError(401, "Unauthorized"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    try {
      const user = await prisma.user.findFirst({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new ApiError(400, "Invalid Token");
      } else if (user.status != "ACTIVE") {
        next(new ApiError(401, "Unauthorized"));
      }
    } catch {
      throw new ApiError(400, "Invalid Token");
    }

    req.user = { id: payload.userId };

    next();
  } catch {
    logger.warn("Invalid Token");
    next(new ApiError(401, "Unauthorized"));
  }
  return;
};
