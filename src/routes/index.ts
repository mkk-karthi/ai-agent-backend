import { Router } from "express";
import authRouter from "./auth.route";
import { authenticate } from "../middlewares/auth.middleware";
import userRouter from "./user.route";
import { Role } from "@prisma/client";

const router = Router();

router.use("/auth", authRouter);
router.use("/user", authenticate, userRouter);

router.get("/test", (req, res) => {
  res.json({
    data: Role.ADMIN,
  });
});

export default router;
