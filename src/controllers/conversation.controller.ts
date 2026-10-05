import type { Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { conversationService } from "../services/conversation.service";
import { sendResponse } from "../utils/api-response";

export const conversationController = {
  async streamContent(req: Request, res: Response, type: "generate" | "edit" | "retry") {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    await conversationService.streamChat({
      type,
      prompt: req.body.prompt ?? "",
      modelId: req.body.modelId ?? "",
      conversationId: req.body.conversationId ?? "",
      userId: req.user.id,
      id: req.body.id ?? "",
      onStart: () => {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
      },
      onChunk: (type: string, text: string) => {
        res.write(JSON.stringify({ type, text }));
      },
      onEnd: () => {
        res.write(JSON.stringify({ type: "end", text: "" }));
        res.end();
      },
    });
  },

  async generateStreamContent(req: Request, res: Response) {
    await conversationController.streamContent(req, res, req.body.id ? "edit" : "generate");
  },

  async retryStreamContent(req: Request, res: Response) {
    await conversationController.streamContent(req, res, "retry");
  },

  async conversations(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const data = await conversationService.conversationList(req.user?.id, req.body);
    sendResponse(res, 200, data, "Conversations fetched succesfully");
  },

  async conversation(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");

    const data = await conversationService.getConversation(req.params.id as string);
    sendResponse(res, 200, data, "Conversation fetched succesfully");
  },

  async conversationMessages(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");

    const data = await conversationService.conversationMessages(req.params.id as string, req.body);
    sendResponse(res, 200, data, "Conversation messages fetched succesfully");
  },

  async updateConversation(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");
    if (!req.body.name) throw new ApiError(400, "Name is required");

    const data = await conversationService.updateConversation(
      req.params.id as string,
      req.body.name,
      req.user?.id,
    );
    sendResponse(res, 200, data, "Conversation updated succesfully");
  },

  async deleteConversation(req: Request, res: Response) {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    if (!req.params.id) throw new ApiError(400, "Id is required");

    const data = await conversationService.deleteConversation(
      req.params.id as string,
      req.user?.id,
    );
    sendResponse(res, 200, null, "Conversation deleted succesfully");
  },
};
