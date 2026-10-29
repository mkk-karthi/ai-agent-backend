import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middlewares/validate.middleware";
import {
  chatSchema,
  conversationShareSchema,
  retryChatSchema,
} from "../modules/conversation.schema";
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

conversationRouter.get("/pin", asyncHandler(conversationController.pinnedConversations));
conversationRouter.put("/pin/:id", asyncHandler(conversationController.pinConversation));
conversationRouter.get(
  "/share/options",
  asyncHandler(conversationController.conversationShareOptions),
);
conversationRouter.post(
  "/share",
  validate(conversationShareSchema),
  asyncHandler(conversationController.shareConversation),
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
