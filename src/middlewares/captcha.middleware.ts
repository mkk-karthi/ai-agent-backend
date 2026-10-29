import type { NextFunction, Request, Response } from "express";
import { recaptchaService } from "../services/recaptcha.service";
import { ApiError } from "../utils/api-error";

export const verifyCaptcha = (action: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token =
        req.body?.captchaToken ||
        (req.headers["x-captcha-token"] as string | undefined);

      const result = await recaptchaService.verifyRecaptchaToken(token, action);

      if (!result.success) {
        throw new ApiError(400, result.error || "Captcha verification failed");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
