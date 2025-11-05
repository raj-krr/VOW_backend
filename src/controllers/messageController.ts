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

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ success: false, message: "messageId is required" });
    }
    const deletedMessage = await Message.findByIdAndDelete(messageId);
    if (!deletedMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    res.status(200).json({ success: true, message: "Message deleted successfully", data: deletedMessage });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

