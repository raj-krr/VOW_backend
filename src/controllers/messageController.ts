import { Request, Response } from "express";
import Message from "../models/message";

export const sendMessageRest = async (req: Request, res: Response) => {
  try {
    const { channelId, content, attachments } = req.body;
    const sender = (req as any).user?._id || req.body.sender;
    const message = await Message.create({ channelId, sender, content, attachments });
    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const messages = await Message.find({ channelId })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
