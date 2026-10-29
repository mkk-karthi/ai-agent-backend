import { env } from "../config/env";
import logger from "../utils/logger";

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export const recaptchaService = {
  async verifyRecaptchaToken(
    token?: string,
    expectedAction?: string,
  ): Promise<{ success: boolean; score?: number; error?: string }> {
    // If secret key is not configured in development, bypass validation with a warning
    if (!env.RECAPTCHA_SECRET_KEY) {
      if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
        logger.warn(
          "[reCAPTCHA] RECAPTCHA_SECRET_KEY is not set. Bypassing verification in development/test.",
        );
        return { success: true, score: 1.0 };
      }
      return { success: false, error: "reCAPTCHA is not configured on server" };
    }

    if (!token) {
      return { success: false, error: "Captcha token is required" };
    }

    try {
      const params = new URLSearchParams({
        secret: env.RECAPTCHA_SECRET_KEY,
        response: token,
      });

      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        logger.error(`[reCAPTCHA] Siteverify returned HTTP status: ${response.status}`);
        return { success: false, error: "Failed to connect to captcha verification server" };
      }

      const data = (await response.json()) as RecaptchaVerifyResponse;

      if (!data.success) {
        logger.warn(`[reCAPTCHA] Verification failed: ${JSON.stringify(data["error-codes"])}`);
        return { success: false, error: "Captcha verification failed" };
      }

      // Check action if provided
      if (expectedAction && data.action && data.action !== expectedAction) {
        logger.warn(
          `[reCAPTCHA] Action mismatch: expected '${expectedAction}', got '${data.action}'`,
        );
        return { success: false, error: "Invalid captcha action" };
      }

      // Check score threshold (v3 gives 0.0 - 1.0)
      const score = data.score ?? 0;
      if (score < env.RECAPTCHA_SCORE_THRESHOLD) {
        logger.warn(
          `[reCAPTCHA] Low score detected: ${score} (threshold: ${env.RECAPTCHA_SCORE_THRESHOLD})`,
        );
        return { success: false, score, error: "Suspicious activity detected" };
      }

      return { success: true, score };
    } catch (err: any) {
      logger.error(`[reCAPTCHA] Error verifying token: ${err?.message || err}`);
      return { success: false, error: "Error during captcha verification" };
    }
  },
};
