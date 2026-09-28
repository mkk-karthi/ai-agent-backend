import type { RequestHandler } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";

export const adminMiddleware: RequestHandler = async (req, res, next) => {
  if (req.user?.id) {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });

    if (user?.role == "ADMIN") {
      return next();
    }
  }

  return next(new ApiError(403, "Unauthorized"));
};
