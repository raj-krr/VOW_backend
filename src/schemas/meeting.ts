import { z } from "zod";

const noEmojiRegex = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;

const dateStringSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    "Invalid date format. Must be a valid ISO date string."
  );

export const scheduleMeetingSchema = z.object({
  params: z.object({
    workspaceId: z.string().min(1, "workspaceId is required"),
  }),
  body: z.object({
    title: z
      .string()
      .min(3, "Meeting title must be at least 3 characters")
      .regex(noEmojiRegex, "Emojis are not allowed in meeting title"),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .regex(noEmojiRegex, "Emojis are not allowed in meeting description")
      .optional(),
    startTime: dateStringSchema,
    endTime: dateStringSchema,
    teamId: z.string().optional(),
    isConference: z.boolean().optional(),
  }),
});

export const updateMeetingSchema = z.object({
  params: z.object({
    meetingId: z.string().min(1, "meetingId is required"),
  }),
  body: z.object({
    title: z
      .string()
      .min(3, "Meeting title must be at least 3 characters")
      .regex(noEmojiRegex, "Emojis are not allowed in meeting title")
      .optional(),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .regex(noEmojiRegex, "Emojis are not allowed in meeting description")
      .optional(),
    startTime: dateStringSchema.optional(),
    endTime: dateStringSchema.optional(),
  }),
});



