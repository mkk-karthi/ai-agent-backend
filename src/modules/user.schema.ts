import { Role, Status } from "@prisma/client";
import z from "zod";

export const passwordSchema = z
  .string("Password must be a string")
  .min(8, "Password must be at least 8 characters long")
  .max(32, "Password cannot exceed 32 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

export const updateUserSchema = z
  .object({
    firstName: z
      .string("First name must be a string")
      .min(3, "First name must be at least 3 characters")
      .max(50, "First name cannot exceed 50 characters"),
    lastName: z
      .string("Last name must be a string")
      .min(1, "Last Name must be at least 1 characters")
      .max(50, "Last name cannot exceed 50 characters")
      .nullish(),
    role: z.enum(Role),
    status: z.enum(Status),
  })
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Either firstName or lastName must be provided",
    path: [],
  });

export const changePasswordSchema = z
  .object({
    oldPassword: passwordSchema.optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type updateUserinput = z.infer<typeof updateUserSchema>;
export type changePasswordInput = z.infer<typeof changePasswordSchema>;
