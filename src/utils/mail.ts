import nodemailer from "nodemailer";
import { env } from "../config/env";
import { ApiError } from "./api-error";
import logger from "./logger";

export const transport = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: false,

  auth: {
    user: env.MAIL_USERNAME,
    pass: env.MAIL_PASSWORD,
  },
});

export const sendMail = async (to: string, subject: string, content: string) => {
  logger.error("Mail sending:", to, subject);
  try {
    const info = await transport.sendMail({
      from: env.MAIL_FROM_ADDRESS,
      to,
      subject,
      html: content,
    });
  } catch (error) {
    logger.error("Error sending mail:", error);
    throw new ApiError(400, "Mail not send");
  }
};
