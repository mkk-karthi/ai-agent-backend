import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { providerController } from "../controllers/provider.controller";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { validate } from "../middlewares/validate.middleware";
import { updateModelSchema, updateProviderSchema } from "../modules/apiToken.schema";

const providerRouter = Router();
providerRouter.get("/model", asyncHandler(providerController.getModels));
providerRouter.get("/", asyncHandler(providerController.getProviders));
providerRouter.patch(
  "/model/:id",
  adminMiddleware,
  validate(updateModelSchema),
  asyncHandler(providerController.updateModelStatus),
);
providerRouter.post(
  "/sync-model/:id",
  adminMiddleware,
  asyncHandler(providerController.syncModels),
);
providerRouter.put(
  "/:id",
  adminMiddleware,
  validate(updateProviderSchema),
  asyncHandler(providerController.updateProvider),
);

export default providerRouter;
