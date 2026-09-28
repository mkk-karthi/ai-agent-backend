import crypto from "crypto";
import { env } from "../config/env";
import { ApiError } from "./api-error";

export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateOtp = (digit: number): string => {
  const min: number = Math.pow(10, digit - 1);
  const max: number = Math.pow(10, digit);

  const otp: number = crypto.randomInt(min, max);
  return otp.toString();
};

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = crypto.scryptSync(env.ENCRYPTION_KEY, "salt", 32);

export const encryption = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

export const decryption = (encryptedData: string): string => {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) throw new ApiError(400, "Invalid Token format");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
