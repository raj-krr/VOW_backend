import { z } from "zod";
import { noEmojisRegex, noEmojis } from "../utils/regex"; 

export const updateMeSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Full name"))
    .optional(),

  organisation: z
    .string()
    .min(3, "Organisation name must be at least 3 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Organisation"))
    .optional(),

  gender: z.enum(["male", "female", "other"]).optional(),

  dob: z
    .string()
    .refine((date) => {
      const parsed = Date.parse(date);
      return !isNaN(parsed);
    }, { message: "Invalid date format. Use ISO format (YYYY-MM-DD)." })
    .optional(),
});
