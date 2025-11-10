import { z } from "zod";

const noEmojisRegex = /^[\p{L}\p{N}\p{P}\p{Zs}]+$/u;
const noEmojis = (field: string) => ({
  message: `${field} cannot contain emojis or special symbols`,
});

export const createWorkspaceSchema = z.object({
  body: z.object({
    workspaceName: z
      .string()
      .min(3, "Workspace name must be at least 3 characters")
      .refine((v) => noEmojisRegex.test(v), noEmojis("Workspace name")),
    inviteEmails: z
      .array(
        z
          .email("Invalid email format")
          .refine((v) => noEmojisRegex.test(v), noEmojis("Email"))
      )
      .optional(),
  }),
});

export const joinWorkspaceSchema = z.object({
  body: z.object({
    inviteCode: z
      .string()
      .min(8, "Invite code is required")
      .max(8)
      .refine((v) => noEmojisRegex.test(v), noEmojis("Invite code")),
  }),
});




