import {z} from "zod";

export const updateMeSchema = z.object({
    fullName: z.string().min(3, "Full name cannot be empty").optional(),
    organisation: z.string().min(3, "Organisation cannot be empty").optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    dob: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Invalid date format",
    }).optional(),
});