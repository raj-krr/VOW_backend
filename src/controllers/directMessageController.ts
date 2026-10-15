import { Request, Response } from "express";
import mongoose from "mongoose";
import DirectMessage from "../models/directMessage";
import Workspace from "../models/workspace";


export const sendDirectMessage = async (req: Request, res: Response) => {
  try {
    const { workspaceId, user1, user2 } = req.params;
    const { content, attachments } = req.body;

    
    const currentUserId = (req as any).user?._id; 

    if (!currentUserId)
      return res.status(401).json({ error: "Unauthorized: user not found in token" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ error: "Workspace not found" });

    const memberIds = workspace.members.map((m: any) =>
      typeof m === "object" && m ? (m._id || m.id || m).toString() : String(m)
    );
    const isMember1 = memberIds.includes(String(user1));
    const isMember2 = memberIds.includes(String(user2));
    if (!isMember1 || !isMember2) {
      console.warn(`[sendDirectMessage] Member check warning for ${user1} / ${user2}`);
    }

    let sender, receiver;

    if (String(currentUserId) === user1) {
      sender = user1;
      receiver = user2;
    } else if (String(currentUserId) === user2) {
      sender = user2;
      receiver = user1;
    } else {
      return res
        .status(403)
        .json({ error: "You are not part of this direct chat" });
    }

    const hasContent = content && content.trim() !== "";
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!hasContent && !hasAttachments)
      return res.status(400).json({ error: "Message content or attachments are required" });

    const message = await DirectMessage.create({
      workspaceId,
      sender,
      receiver,
      content,
      attachments,
    });

   const savedMessage = await DirectMessage.findById(message._id)
  .populate("sender", "username avatar")
  .populate("receiver", "username avatar");

    res.status(201).json(savedMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};


export const getDirectMessages = async (req: Request, res: Response) => {
  try {
    const { workspaceId, user1, user2 } = req.params;
    const paramOtherId = (req.params as any).otherUserId;
    const currentUserId = (req as any).user?._id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized: user not found in token" });
    }

    const currentIdStr = String(currentUserId);
    let targetUserId = paramOtherId;

    if (!targetUserId) {
      if (user1 && user2) {
        if (currentIdStr === String(user1)) {
          targetUserId = String(user2);
        } else if (currentIdStr === String(user2)) {
          targetUserId = String(user1);
        } else {
          // If neither directly matches, pick the valid identifier that is not current user or placeholder
          targetUserId = (user1 === "undefined" || user1 === "null" || user1 === "me")
            ? String(user2)
            : String(user1);
        }
      } else if (user1) {
        targetUserId = String(user1);
      }
    }

    if (
      !targetUserId ||
      targetUserId === "undefined" ||
      targetUserId === "null" ||
      targetUserId === "me" ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return res.json([]);
    }

    const currentObjId = mongoose.Types.ObjectId.isValid(currentIdStr)
      ? new mongoose.Types.ObjectId(currentIdStr)
      : currentUserId;
    const targetObjId = new mongoose.Types.ObjectId(targetUserId);

    const messages = await DirectMessage.find({
      $or: [
        { sender: currentObjId, receiver: targetObjId },
        { sender: targetObjId, receiver: currentObjId },
        { sender: currentIdStr, receiver: targetUserId },
        { sender: targetUserId, receiver: currentIdStr },
      ],
    })
      .populate("sender", "username fullName avatar email")
      .populate("receiver", "username fullName avatar email")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteDirectMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const deleted = await DirectMessage.findByIdAndDelete(messageId);
    if (!deleted)
      return res.status(404).json({ error: "Message not found" });

    res.json({ success: true, message: "Message deleted", data: deleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
