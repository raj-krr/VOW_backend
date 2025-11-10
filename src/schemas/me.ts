import { z } from "zod";

const noEmojisRegex = /^[\p{L}\p{N}\p{P}\p{Zs}]+$/u;

export const updateMeSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name cannot be empty")
    .refine((val) => noEmojisRegex.test(val), {
      message: "Full name cannot contain emojis or special symbols",
    })
    .optional(),

  organisation: z
    .string()
    .min(3, "Organisation cannot be empty")
    .refine((val) => noEmojisRegex.test(val), {
      message: "Organisation name cannot contain emojis or special symbols",
    })
    .optional(),

  gender: z.enum(["male", "female", "other"]).optional(),

  dob: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid date format",
    })
    .optional(),
});
