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

  TAVILY_API_KEY: z.string().optional().default(""),

  MAIL_HOST: z.string().default("smtp.gmail.com"),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_USERNAME: z.string(),
  MAIL_PASSWORD: z.string(),
  MAIL_FROM_ADDRESS: z.string(),

  MAX_TOOL_TIMES: z.coerce.number().int().positive().default(5),
  DEFAULT_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  DEFAULT_TEMPERATURE: z.coerce
    .number()
    .min(0, "Value must be at least 0")
    .max(1, "Value must be at most 1")
    .multipleOf(0.1, "Only 1 decimal place is allowed")
    .default(0.7),
  MAX_PIN_CONVERSATION: z.coerce.number().int().positive().default(5),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  RECAPTCHA_SECRET_KEY: z.string().optional().default(""),
  RECAPTCHA_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
});

export const env = envSchema.parse(process.env);
