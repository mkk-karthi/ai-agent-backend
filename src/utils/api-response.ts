import type { Response } from "express";

export const sendResponse = <T>(res: Response, statusCode: number, data: T, message?: string) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    code: statusCode,
    message,
    data,
  });
};
