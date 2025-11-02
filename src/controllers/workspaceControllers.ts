import {Request ,Response} from "express";
import mongoose from "mongoose";
import Workspace from "../models/workspace";
import { generateInviteCode } from "../utils/otp";
import { sendInviteEmail } from "../middlewares/email";
import { ObjectId, Types } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { generateWorkspaceToken } from "../middlewares/workspace.middleware";
import { options}  from "../constant"

export const createWorkspace = async (req: Request, res: Response) : Promise<void> => {
  try {
    const userID = req.user?._id as Types.ObjectId ;
    if (!userID) throw new Error("Unauthorized");

    const { workspaceName , inviteEmails } = req.body;
    const inviteCode = generateInviteCode();

    const workspace = new Workspace({
      workspaceName,
      inviterName: req.user?.fullName,
      manager: userID,
      members: [userID],
      inviteCode
    });

await workspace.save();

 const workspaceIdStr = (workspace._id as Types.ObjectId).toString();
    const workspaceToken = generateWorkspaceToken(workspaceIdStr, userID.toString());

    const cookieName = `workspaceToken_${workspaceIdStr}`;
    res.cookie(cookieName, workspaceToken,options );
      

    res.status(200).json({
      success: true,
      message: "Joined workspace successfully",
      workspace,
      cookieName,
      workspaceToken,
    });

if (inviteEmails && inviteEmails.length > 0) {
      for (const email of inviteEmails) {
       await sendInviteEmail(email, workspace.inviterName, workspace.workspaceName, workspace.inviteCode);
      }
    }

res.status(201).json({
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

  export const joinWorkspace = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id as Types.ObjectId;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { inviteCode } = req.body;
    if (!inviteCode) throw new ApiError(400, "Invite code is required");

    const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim() });
    if (!workspace) throw new ApiError(404, "Invalid invite code");

    if (workspace.members.includes(userId)) {
      res.json({ success:false ,msg:"User is already a member"});
    } else  {
      workspace.members.push(userId);
      await workspace.save();

    const workspaceIdStr = (workspace._id as Types.ObjectId).toString();
    const workspaceToken = generateWorkspaceToken(workspaceIdStr, userId.toString());

    const cookieName = `workspaceToken_${workspaceIdStr}`;
    res.cookie(cookieName, workspaceToken,options );
      

    res.status(200).json({
      success: true,
      message: "Joined workspace successfully",
      workspace,
      cookieName,
      workspaceToken,
    });
  };
  } catch (error: any) {
    console.error("Join workspace error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
export const getWorkspaceDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id as Types.ObjectId ;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const workspaces = await Workspace.find({ members: userId })
      .populate("members", "fullName email");
    res.json({ success: true, workspaces });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err });
  }
}

export const rejoinWorkspace = async (req: Request , res: Response): Promise<void> => {
  try {
    const{ workspaceId } = req.params;
    if (!workspaceId) {
      res.status(400).json({ success: false, message: "workspaceId not provided" });
      return;
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ success: false, message: "Workspace not found" });
      return;
    }

    res.status(200).json({ success: true,msg:"workshop rejoined successfully" ,workspaceId });
  } catch (error: any) {
    console.error("Rejoin workspace error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

export const workspaceMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      res.status(400).json({ success: false, message: "workspaceId not provided" });
      return;
    }

   
    const workspace = await Workspace.findById(workspaceId)
      .populate("members", "fullName ");

    if (!workspace) {
      res.status(404).json({ success: false, message: "Workspace not found" });
      return;
    }

    const members = workspace.members.map((m: any) => ({
      id: m._id,
      fullName: m.fullName,
    }));

    res.status(200).json({ success: true, members });
  } catch (error: any) {
    console.error("Workspace members error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const deleteWorkspace = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id; 
    const { workspaceId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ message: "Workspace not found" ,workspaceId});
      return;
    }
    
    if (workspace.manager.toString() !== userId.toString()) {
      res.status(403).json({ message: "Only the admin can delete this workspace" });
      return;
    }

    await Workspace.findByIdAndDelete(workspaceId);
    res.status(200).json({ message: "Workspace deleted successfully" });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
