import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { userController } from "../controllers/user.controller";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { validate } from "../middlewares/validate.middleware";
import { changePasswordSchema, updateUserSchema } from "../modules/user.schema";
import { paginationSchema } from "../modules/common.schema";

const userRouter = Router();

userRouter.post("/", adminMiddleware, validate(paginationSchema), asyncHandler(userController.getUsers));
userRouter.get("/:id", adminMiddleware, asyncHandler(userController.getUser));
userRouter.put("/", validate(updateUserSchema), asyncHandler(userController.updateUser));
userRouter.post(
  "/change-password",
  validate(changePasswordSchema),
  asyncHandler(userController.changePassword),
);
userRouter.put(
  "/:id",
  adminMiddleware,
  validate(updateUserSchema),
  asyncHandler(userController.updateUser),
);

export default userRouter;
