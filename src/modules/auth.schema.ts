import z from "zod";

export const passwordSchema = z
  .string("Password must be a string")
  .min(8, "Password must be at least 8 characters long")
  .max(32, "Password cannot exceed 32 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

export const registerSchema = z
  .object({
    email: z.email("Invalid email").transform((v) => v.toLowerCase().trim()),
    password: passwordSchema,
    confirmPassword: z
      .string("Confirm password must be a string")
      .min(1, "Please confirm your password"),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Invalid email").transform((v) => v.toLowerCase().trim()),
  password: passwordSchema,
  captchaToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email").transform((v) => v.toLowerCase().trim()),
  captchaToken: z.string().optional(),
});

export const resetPasswordSchema = z
  .object({
    email: z.email("Invalid email").transform((v) => v.toLowerCase().trim()),
    otp: z.string().regex(/^\d+$/, "Must be only digits").length(6, "OTP must be 6 characters"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type forgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type resetPasswordInput = z.infer<typeof resetPasswordSchema>;
