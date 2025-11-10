import { z } from "zod";

const noEmojisRegex = /^[\p{L}\p{N}\p{P}\p{Zs}]+$/u;

const noEmojis = (fieldName: string) => ({
  message: `${fieldName} cannot contain emojis or special symbols`,
});

export const registerSchema = z.object({
  email: z
    .email("Invalid email address")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Email")),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Username")),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Password")),
});

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .length(6, "Verification code must be 6 digits")
    .refine((v) => /^\d{6}$/.test(v), { message: "Verification code must contain only digits" }),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Email or username is required")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Identifier")),
  password: z
    .string()
    .min(6, "Password is required")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Password")),
});

export const forgetPasswordSchema = z.object({
  email: z
    .email("Invalid email address")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Email")),
});

export const resetPasswordSchema = z.object({
  email: z
    .email("Invalid email address")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Email")),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .refine((v) => /^\d{6}$/.test(v), { message: "OTP must contain only digits" }),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("New password")),
});

export const logoutSchema = z.object({
  refreshToken: z
    .string()
    .optional()
    .refine((v) => !v || noEmojisRegex.test(v), noEmojis("Refresh token")),
});
