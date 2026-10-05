import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string(),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  VERIFY_MAIL_EXPIRES_IN: z.coerce.number().int().positive(),
  RESET_PASSWORD_EXPIRES_IN: z.coerce.number().int().positive(),

  ENCRYPTION_KEY: z.string().min(32),
  FRONTEND_URL: z.url(),

  GEMINI_API_KEY: z.string(),
  GEMINI_DEFAULT_MODEL: z.string(),
  GENAI_TEST: z.string().transform((v) => v == "true"),

  MAIL_HOST: z.string().default("smtp.gmail.com"),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_USERNAME: z.string(),
  MAIL_PASSWORD: z.string(),
  MAIL_FROM_ADDRESS: z.string(),
});

export const env = envSchema.parse(process.env);
