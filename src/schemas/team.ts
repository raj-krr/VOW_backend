import { z } from "zod";

const noEmojiRegex = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;

export const createTeamSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, "Team name must be at least 3 characters")
      .regex(noEmojiRegex, "Emojis are not allowed in team name"),
    memberIds: z.array(z.string()).optional(), 
    superviser: z.string().optional(), 
  }),
});

export const renameTeamSchema = z.object({
  body: z.object({
    newName: z
      .string()
      .min(3, "New team name must be at least 3 characters")
      .regex(noEmojiRegex, "Emojis are not allowed in team name"),
  }),
  params: z.object({
    teamId: z.string(), 
  }),
});


export const assignSuperviserSchema = z.object({
  body: z.object({
    leadId: z.string().optional(), 
  }),
  params: z.object({
    teamId: z.string(), 
  }),
});
