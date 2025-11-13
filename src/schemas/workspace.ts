import { z } from "zod";
import { noEmojisRegex, noEmojis } from "../utils/regex";

export const createWorkspaceSchema = z.object({
  workspaceName: z
    .string()
    .min(3, "Workspace name must be at least 3 characters")
    .max(25, "workspace name must be less than 25 character")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Workspace name")),
  inviteEmails: z
    .array(
      z
        .email("Invalid email format")
        .refine((v) => noEmojisRegex.test(v), noEmojis("Email"))
    )
    .optional(),
});

export const joinWorkspaceSchema = z.object({
  inviteCode: z
    .string()
    .length(8, "Invite code must be 8 characters")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Invite code")),
});
