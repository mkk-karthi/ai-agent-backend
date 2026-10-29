import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validate = (
  schema: ZodType,
  type: "params" | "query" | "body" = "body",
): RequestHandler => {
  return async (req, res, next) => {
    let result;
    if (type === "query") {
      result = await schema.safeParseAsync(req.query);
    } else if (type === "params") {
      result = await schema.safeParseAsync(req.params);
    } else result = await schema.safeParseAsync(req.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;

    next();
  };
};
