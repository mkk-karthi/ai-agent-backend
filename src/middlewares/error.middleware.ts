import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ZodError) {
    let errors: { [index: string]: string } = {};
    err.issues.forEach((v) => {
      const fieldName = v.path.join(".");
      const errorMessage = v.message;

      errors[fieldName] = errorMessage;
    });

    res.status(400).json({
      success: false,
      code: 400,
      message: "Validation failed",
      errors: errors,
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode || 400).json({
      success: false,
      code: err.statusCode || 400,
      message: err.message,
      errors: err.details,
    });
    return;
  }

  res.status(500).json({ success: false, code: 500, message: "Internal server error" });
};
