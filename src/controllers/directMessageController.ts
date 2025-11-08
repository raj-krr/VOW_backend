import { Request, Response } from "express";
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

    const isMember1 = workspace.members.some((m) => String(m) === user1);
    const isMember2 = workspace.members.some((m) => String(m) === user2);
    if (!isMember1 || !isMember2)
      return res.status(403).json({ error: "Users not in same workspace" });

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

    if (!content || content.trim() === "")
      return res.status(400).json({ error: "Message content is required" });

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

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace)
      return res.status(404).json({ error: "Workspace not found" });

    const isMember1 = workspace.members.some((m) => String(m) === user1);
    const isMember2 = workspace.members.some((m) => String(m) === user2);
    if (!isMember1 || !isMember2)
      return res.status(403).json({ error: "Users not in same workspace" });

    const messages = await DirectMessage.find({
      workspaceId,
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    })
      .populate("sender", "username avatar")
      .populate("receiver", "username avatar")
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
