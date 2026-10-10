import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { sendResponse } from "../utils/api-response";
import { providerService } from "../services/provider.service";

export const providerController = {
  async getModels(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const datas = await providerService.getModels(req.user?.id);

    if (!datas) throw new ApiError(200, "Models not found");
    sendResponse(res, 200, datas, "Model fetched succesfully");
  },

  async getProviders(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const datas = await providerService.getProviders();

    if (!datas) throw new ApiError(200, "Provider not found");
    sendResponse(res, 200, datas, "Provider fetched succesfully");
  },

  async updateModelStatus(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");

    const datas = await providerService.updateModelStatus(Number(req.params.id), req.body.status);

    sendResponse(res, 200, datas, "Model updated succesfully");
  },

  async updateProvider(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");

    const datas = await providerService.updateProvider(Number(req.params.id), req.body);

    sendResponse(res, 200, datas, "Provider updated succesfully");
  },

  async syncModels(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");

    const datas = await providerService.syncModels(Number(req.params.id));

    sendResponse(res, 200, datas, "Model updated succesfully");
  },
};
