import { Request, Response } from "express";
import DirectMessage from "../models/directMessage";

export const getDirectMessages = async (req: Request, res: Response) => {
  try {
    const { user1, user2, workspaceId } = req.params;
    const messages = await DirectMessage.find({
      workspaceId,
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 },
      ],
    })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
