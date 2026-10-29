import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { sendResponse } from "../utils/api-response";

export const authController = {
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body);

    sendResponse(res, 201, {}, "Register successfully");
  },

  async login(req: Request, res: Response) {
    const user = await authService.login(req.body);

    res.cookie("refresh-token", user.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: false,
      maxAge: parseInt(env.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, 200, user, "Login successfully");
  },

  async refreshToken(req: Request, res: Response) {
    const refreshToken = req.cookies["refresh-token"] ?? null;
    if (!refreshToken) throw new ApiError(400, "Invalid token");

    const data = await authService.createAccessToken(refreshToken);

    sendResponse(res, 200, { token: data }, "Token generated successfully");
  },

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies["refresh-token"] ?? null;
    if (!refreshToken) throw new ApiError(400, "Invalid token");

    await authService.logout(refreshToken);

    sendResponse(res, 200, {}, "Logout successfully");
  },

  async verifyMail(req: Request, res: Response) {
    if (!req.params.token) throw new ApiError(400, "Token is required");

    await authService.verifyMail(req.params.token as string);

    sendResponse(res, 200, {}, "Mail verified");
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body);

    sendResponse(res, 200, {}, "OTP sent your mail");
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body);

    sendResponse(res, 200, {}, "Password updated");
  },

  async googleCallback(req: Request, res: Response) {
    // req.user is populated by Passport after successful Google OAuth
    const googleUser = req.user as { id: string } | undefined;

    if (!googleUser?.id) {
      return res.redirect(`${env.FRONTEND_URL}/auth/login?error=google_failed`);
    }

    const data = await authService.googleLogin(googleUser.id);

    // Set the refresh token as an httpOnly cookie (same pattern as regular login)
    res.cookie("refresh-token", data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: parseInt(env.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60 * 1000,
    });

    // Pass access token to the frontend via redirect query params (do not expose user in URL)
    const params = new URLSearchParams({
      token: data.accessToken,
    });

    return res.redirect(`${env.FRONTEND_URL}/auth/google/callback?${params.toString()}`);
  },
};

