import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const verifyEmailSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, "Email or username is required"),
  password: z.string().min(6, "Password is required"),
});

export const forgetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});
