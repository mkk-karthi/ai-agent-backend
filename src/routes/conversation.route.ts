import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { apiTokenController } from "../controllers/apiToken.controller";
import { apiTokenSchema } from "../modules/apiToken.schema";
import { chatSchema, retryChatSchema } from "../modules/conversation.schema";
import { conversationController } from "../controllers/conversation.controller";
import { paginationSchema } from "../modules/common.schema";

const conversationRouter = Router();
conversationRouter.get("/model", asyncHandler(apiTokenController.getModels));
conversationRouter.get("/token", asyncHandler(apiTokenController.tokens));
conversationRouter.put(
  "/token",
  validate(apiTokenSchema),
  asyncHandler(apiTokenController.updateToken),
);
conversationRouter.post(
  "/generate-stream-content",
  validate(chatSchema),
  asyncHandler(conversationController.generateStreamContent),
);
conversationRouter.post(
  "/retry-stream-content",
  validate(retryChatSchema),
  asyncHandler(conversationController.retryStreamContent),
);
conversationRouter.get(
  "/conversations",
  validate(paginationSchema, "query"),
  asyncHandler(conversationController.conversations),
);
conversationRouter.put(
  "/conversation/:id",
  asyncHandler(conversationController.updateConversation),
);
conversationRouter.delete(
  "/conversation/:id",
  asyncHandler(conversationController.deleteConversation),
);
conversationRouter.get("/conversation/:id", asyncHandler(conversationController.conversation));
conversationRouter.get(
  "/conversation-messages/:id",
  validate(paginationSchema, "query"),
  asyncHandler(conversationController.conversationMessages),
);

export default conversationRouter;
