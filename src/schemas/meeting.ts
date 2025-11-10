import { z } from "zod";
import { noEmojisRegex, noEmojis } from "../utils/regex"; 

const dateStringSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    "Invalid date format. Must be a valid ISO date string."
  );

export const scheduleMeetingSchema = z
  .object({
    workspaceId: z.string().min(1, "workspaceId is required"),

    title: z
      .string()
      .min(3, "Meeting title must be at least 3 characters")
      .refine((v) => noEmojisRegex.test(v), noEmojis("Meeting title")),

    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .refine((v) => noEmojisRegex.test(v), noEmojis("Meeting description"))
      .optional(),

    startTime: dateStringSchema,
    endTime: dateStringSchema,

    teamId: z.string().optional(),
    isConference: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.startTime ||
      !data.endTime ||
      new Date(data.endTime).getTime() >
        new Date(data.startTime).getTime(),
    {
      message: "endTime must be after startTime",
      path: ["endTime"],
    }
  );

export const updateMeetingSchema = z.object({
  meetingId: z.string().min(1, "meetingId is required"),

  title: z
    .string()
    .min(3, "Meeting title must be at least 3 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Meeting title"))
    .optional(),

  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Meeting description"))
    .optional(),

  startTime: dateStringSchema.optional(),
  endTime: dateStringSchema.optional(),
});
