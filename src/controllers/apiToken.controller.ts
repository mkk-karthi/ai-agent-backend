import type { Request, Response } from "express";
import { apiTokenService } from "../services/apiToken.service";
import { ApiError } from "../utils/api-error";
import { sendResponse } from "../utils/api-response";
import { userService } from "../services/user.service";

export const apiTokenController = {
  async tokens(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const tokens = await apiTokenService.getApiTokens(req.user?.id);
    sendResponse(res, 200, tokens, "Token fetched succesfully");
  },

  async updateToken(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const update = await apiTokenService.updateApiToken(req.body, req.user?.id);
    sendResponse(res, 200, update, "Token update succesfully");
  },

  async getUsageTokens(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const user = await userService.getUser(req.user.id);

    const update = await apiTokenService.getUsageTokens({
      ...req.body,
      userId:
        user?.role === "ADMIN" && (req.body.userId || req.body.userId == "")
          ? req.body.userId
          : req.user.id,
    });
    sendResponse(res, 200, update, "Token fetch succesfully");
  },

  async getProviderUsage(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const update = await apiTokenService.getProviderUsage(1);
    sendResponse(res, 200, update, "Provider fetch succesfully");
  },

  async getModelUsage(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const update = await apiTokenService.getModelUsage(1);
    sendResponse(res, 200, update, "Model fetch succesfully");
  },
};
