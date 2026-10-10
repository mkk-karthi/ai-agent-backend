import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middlewares/validate.middleware";
import { chatSchema, retryChatSchema } from "../modules/conversation.schema";
import { conversationController } from "../controllers/conversation.controller";
import { paginationSchema } from "../modules/common.schema";

const conversationRouter = Router();
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
  "/",
  validate(paginationSchema, "query"),
  asyncHandler(conversationController.conversations),
);
conversationRouter.put("/:id", asyncHandler(conversationController.updateConversation));
conversationRouter.delete("/:id", asyncHandler(conversationController.deleteConversation));
conversationRouter.get("/:id", asyncHandler(conversationController.conversation));
conversationRouter.get(
  "/messages/:id",
  validate(paginationSchema, "query"),
  asyncHandler(conversationController.conversationMessages),
);

export default conversationRouter;
