import { Request, Response } from "express";
import mongoose from "mongoose";
import Channel from "../../models/chat/channel";
import Message from "../../models/chat/message";

type RequestWithUser = Request & { user?: { id: string; username?: string } };

const createMessage = async (req: RequestWithUser, res: Response) => {
  try {
    const { channelId, content, attachments } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Unauthenticated" });
    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ error: "Invalid channelId" });
    }
    if (!content?.trim()) {
      return res.status(400).json({ error: "Content required" });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (channel.type === "private" && !channel.members.includes(userId)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const messageDoc = await Message.create({
      channelId: new mongoose.Types.ObjectId(channelId),
      sender: new mongoose.Types.ObjectId(userId),
      content,
      attachments: attachments || [],
    });

    const [message] = await Message.aggregate([
      { $match: { _id: messageDoc._id } },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      { $unwind: "$sender" },
      {
        $lookup: {
          from: "channels",
          localField: "channelId",
          foreignField: "_id",
          as: "channel",
        },
      },
      { $unwind: "$channel" },
      {
        $project: {
          _id: 1,
          content: 1,
          attachments: 1,
          createdAt: 1,
          "sender._id": 1,
          "sender.username": 1,
          "sender.email": 1,
          "channel._id": 1,
          "channel.name": 1,
          "channel.slug": 1,
        },
      },
    ]);

    return res.status(201).json(message);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create message" });
  }
};

export { createMessage };
