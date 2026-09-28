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

const authRouter = Router();

authRouter.post("/register", validate(registerSchema), asyncHandler(authController.register));
authRouter.post("/login", validate(loginSchema), asyncHandler(authController.login));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.post("/token", asyncHandler(authController.refreshToken));
authRouter.get("/user", authenticate, asyncHandler(userController.getAuthUser));

authRouter.post("/verify-mail/:token", asyncHandler(authController.verifyMail));
authRouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

export default authRouter;
