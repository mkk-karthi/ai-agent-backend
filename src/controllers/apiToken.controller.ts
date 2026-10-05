import type { Request, Response } from "express";
import { apiTokenService } from "../services/apiToken.service";
import { ApiError } from "../utils/api-error";
import { sendResponse } from "../utils/api-response";

export const apiTokenController = {
  async getModels(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const datas = await apiTokenService.getModels(req.user?.id);

    if (!datas) throw new ApiError(404, "Models not found");
    sendResponse(res, 200, datas, "Model fetched succesfully");
  },

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
};
