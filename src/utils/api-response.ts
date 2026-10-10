import type { Response } from "express";

export const sendResponse = <T>(res: Response, status: number, data: T, message?: string) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    code: status,
    message,
    data,
  });
};
