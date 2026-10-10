import { Router } from "express";
import authRouter from "./auth.route";
import { authenticate } from "../middlewares/auth.middleware";
import userRouter from "./user.route";
import conversationRouter from "./conversation.route";
import tokenRouter from "./token.route";
import providerRouter from "./provider.route";
const router = Router();

router.get("/test", async (req, res) => {
  res.json({
    success: true,
  });
});

router.use("/auth", authRouter);
router.use("/user", authenticate, userRouter);
router.use("/conversation", authenticate, conversationRouter);
router.use("/token", authenticate, tokenRouter);
router.use("/provider", authenticate, providerRouter);

export default router;
