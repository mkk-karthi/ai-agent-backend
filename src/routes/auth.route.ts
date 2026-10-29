import { Router, type RequestHandler } from "express";
import { validate } from "../middlewares/validate.middleware";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../modules/auth.schema";
import { asyncHandler } from "../utils/async-handler";
import { authController } from "../controllers/auth.controller";
import { userController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import passport from "../config/passport";
import { verifyCaptcha } from "../middlewares/captcha.middleware";

const authRouter = Router();

// Initialize Passport (stateless — no sessions, JWT-only)
authRouter.use(passport.initialize());

authRouter.post(
  "/register",
  verifyCaptcha("register"),
  validate(registerSchema),
  asyncHandler(authController.register),
);
authRouter.post(
  "/login",
  verifyCaptcha("login"),
  validate(loginSchema),
  asyncHandler(authController.login),
);
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.post("/token", asyncHandler(authController.refreshToken));
authRouter.get("/user", authenticate, asyncHandler(userController.getAuthUser));

authRouter.post("/verify-mail/:token", asyncHandler(authController.verifyMail));
authRouter.post(
  "/forgot-password",
  verifyCaptcha("forgot_password"),
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  "/reset-password",
  verifyCaptcha("reset_password"),
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

// Google OAuth2 routes
authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/login?error=google_failed",
  }),
  asyncHandler(authController.googleCallback),
);

export default authRouter;
