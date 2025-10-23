import { Request, Response } from "express";
import mongoose from "mongoose";
import Channel from "../../models/chat/channel";
import Message from "../../models/chat/message";

type RequestWithUser = Request & { user?: { id: string; username?: string } };

const createMessage = async (req: RequestWithUser, res: Response) => {
  try {
    const { channelId, content, attachments } = req.body;
    const userId = req.user?.id;
    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ error: "Invalid channelId" });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (channel.type === "private" && !channel.members.map(String).includes(String(userId))) {
      return res.status(403).json({ error: "Not a member of private channel" });
    }

    const message = new Message({
      channelId,
      sender: userId,
      content,
      attachments: attachments || [],
    });
    await message.save();
    await (await message.populate("sender", "username"));

    return res.status(201).json(message);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create message" });
  }
}

export { createMessage };