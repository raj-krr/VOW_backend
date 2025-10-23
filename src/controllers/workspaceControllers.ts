import {Request ,Response} from "express";
import UserModel, { IUser } from "../models/user";
import Workspace from "../models/workspace";
import { generateInviteCode } from "../utils/otp";
import { sendInviteEmail } from "../middlewares/email";


export const createWorkspace = async (req: Request, res: Response) : Promise<void> => {
  try {
    const userID = req.user?._id;
    if (!userID) throw new Error("Unauthorized");

    const { workspaceName , inviteEmails } = req.body;
    const inviteCode = generateInviteCode();

    const workspace = new Workspace({
      workspaceName,
      inviterName: req.user?.fullName,
      admin: userID,
      members: [userID],
      inviteCode
    });

await workspace.save();

if (inviteEmails && inviteEmails.length > 0) {
      for (const email of inviteEmails) {
       await sendInviteEmail(email, workspace.inviterName, workspace.workspaceName, workspace.inviteCode);
      }
    }

res.status(201).json({
      message: "Workspace created successfully",
      workspace,
      inviteCode,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

   
