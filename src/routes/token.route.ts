import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { apiTokenController } from "../controllers/apiToken.controller";
import { validate } from "../middlewares/validate.middleware";
import { apiTokenSchema, tokenUsageSchema } from "../modules/apiToken.schema";
import { adminMiddleware } from "../middlewares/admin.middleware";

const tokenRouter = Router();

tokenRouter.get("/", asyncHandler(apiTokenController.tokens));
tokenRouter.put("/", validate(apiTokenSchema), asyncHandler(apiTokenController.updateToken));
tokenRouter.get(
  "/usage",
  validate(tokenUsageSchema, "query"),
  asyncHandler(apiTokenController.getUsageTokens),
);
tokenRouter.get(
  "/provider-usage",
  adminMiddleware,
  asyncHandler(apiTokenController.getProviderUsage),
);
tokenRouter.get("/model-usage", adminMiddleware, asyncHandler(apiTokenController.getModelUsage));

export default tokenRouter;
