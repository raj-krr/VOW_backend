import { z } from "zod";
import { noEmojisRegex, noEmojis } from "../utils/regex"; 

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, "Team name must be at least 3 characters")
    .max(20,"team name must be less than 20 character")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Team name")),

  memberIds: z.array(z.string()).optional(),
  superviser: z.string().optional(),
});

export const renameTeamSchema = z.object({
  teamId: z.string().min(1, "teamId is required"),

  newName: z
    .string()
    .min(3, "New team name must be at least 3 characters")
    .max(20, "newName must be less than 20 character")
    .refine((v) => noEmojisRegex.test(v), noEmojis("Team name")),
});

export const assignSuperviserSchema = z.object({
  teamId: z.string().min(1, "teamId is required"),
  leadId: z.string().optional(),
});
