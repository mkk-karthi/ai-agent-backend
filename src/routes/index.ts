import { Router } from "express";
import authRouter from "./auth.route";
import { authenticate } from "../middlewares/auth.middleware";
import userRouter from "./user.route";
import conversationRouter from "./conversation.route";

const router = Router();

router.get("/test", async (req, res) => {
  res.json({
    success: true,
  });
});

router.use("/auth", authRouter);
router.use("/user", authenticate, userRouter);
router.use("/", authenticate, conversationRouter);

export default router;
