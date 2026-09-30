import { z } from "zod";
import { noEmojisRegex, noEmojis } from "../utils/regex";

export const updateMeSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name must be provided")
    .max(100, "Full name must be less than 100 characters")
    .refine((v) => !v || noEmojisRegex.test(v), noEmojis("Full name"))
    .optional()
    .or(z.literal("")),

  organisation: z
    .string()
    .max(100, "Organisation must be less than 100 characters")
    .refine((v) => !v || noEmojisRegex.test(v), noEmojis("Organisation"))
    .optional()
    .or(z.literal("")),

  gender: z
    .string()
    .optional()
    .or(z.literal("")),

  dob: z
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), {
      message: "Invalid date format. Use ISO format (YYYY-MM-DD).",
    })
    .optional()
    .or(z.literal("")),
});
