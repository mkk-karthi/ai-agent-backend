import type { Request, Response } from "express";
import { userService } from "../services/user.service";
import { sendResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";

export const userController = {
  async getUsers(req: Request, res: Response) {
    const users = await userService.getUsers(req.body);

    if (!users) throw new ApiError(404, "Users not found");

    sendResponse(res, 200, users, "User fetched succesfully");
  },

  async getUser(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const user = await userService.getUser((req.params.id || req.user.id) as string);
    if (!user) throw new ApiError(404, "User not found");

    sendResponse(res, 200, user, "User fetched succesfully");
  },

  async getAuthUser(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const user = await userService.getUser(req.user.id);
    if (!user) throw new ApiError(404, "User not found");

    sendResponse(res, 200, user, "User fetched succesfully");
  },

  async updateUser(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const data = await userService.updateUser(
      (req.params.id || req.user.id) as string,
      req.body,
      req.user.id,
    );

    sendResponse(res, 200, data, "User updated succesfully");
  },

  async changePassword(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    await userService.changePassword((req.params.id || req.user.id) as string, req.body);

    sendResponse(res, 200, [], "User updated succesfully");
  },
};
