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

export const whitelistPaths: (string | RegExp)[] = [
  "/test",
  "/health",
  "/auth",
  "/shared",
];

export const isWhitelisted = (req: Request): boolean => {
  const currentPath = req.path;
  const originalUrl = req.originalUrl?.split("?")[0] || "";
  const baseUrl = req.baseUrl || "";

  const candidates = [
    currentPath,
    originalUrl,
    originalUrl.replace(/^\/api/, ""),
    `${baseUrl}${currentPath}`.replace(/^\/api/, ""),
  ].filter(Boolean);

  return whitelistPaths.some((rule) => {
    if (typeof rule === "string") {
      return candidates.some(
        (candidate) =>
          candidate === rule ||
          candidate.startsWith(`${rule}/`) ||
          candidate.startsWith(rule),
      );
    }
    return candidates.some((candidate) => rule.test(candidate));
  });
};

export const authenticate: RequestHandler = async (req, res, next) => {
  const whitelisted = isWhitelisted(req);
  const authorization = req.headers.authorization;

  if (!authorization) {
    if (whitelisted) {
      return next();
    }
    logger.warn("Authorization is required");
    return next(new ApiError(401, "Unauthorized"));
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    if (whitelisted) {
      return next();
    }
    logger.warn("Invalid Token format");
    return next(new ApiError(401, "Unauthorized"));
  }

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: payload.userId },
    });

    if (!user) {
      if (whitelisted) return next();
      return next(new ApiError(400, "Invalid Token"));
    } else if (user.status !== "ACTIVE") {
      if (whitelisted) return next();
      return next(new ApiError(401, "Unauthorized"));
    }

    req.user = { id: payload.userId };
    return next();
  } catch {
    if (whitelisted) {
      return next();
    }
    logger.warn("Invalid Token");
    return next(new ApiError(401, "Unauthorized"));
  }
};
