import { Request, Response } from "express";
import mongoose from "mongoose";
import Channel from "../../models/chat/channel";
import Message from "../../models/chat/message";

type RequestWithUser = Request & { user?: { id: string; username?: string } };

const listChannels = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.id;
    const publicChannels = await Channel.find({ type: "public" }).lean();
    const privateChannels = userId
      ? await Channel.find({ type: "private", members: userId }).lean()
      : [];
    return res.json({ public: publicChannels, private: privateChannels });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list channels" });
  }
}

const getChannel = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { slug: id };
    const channel = await Channel.findOne(query).lean();
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (channel.type === "private") {
      const userId = req.user?.id;
      if (!userId || !channel.members.map(String).includes(String(userId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.json(channel);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch channel" });
  }
}

const createChannel = async (req: RequestWithUser, res: Response) => {
  try {
    const { name, slug, type = "public", members = [] } = req.body;
    if (!name || !slug)
      return res.status(400).json({ error: "name and slug required" });
    const channel = new Channel({
      name,
      slug,
      type,
      members,
      createdBy: req.user?.id,
    });
    await channel.save();
    return res.status(201).json(channel);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create channel" });
  }
}

const joinChannel = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const channel = await Channel.findById(id);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    if (channel.type === "private") {
      if (!channel.members.map(String).includes(String(userId))) {
        return res.status(403).json({ error: "Private channel - invite only" });
      }
    } else {
      if (!channel.members.map(String).includes(String(userId))) {
        channel.members.push(new mongoose.Types.ObjectId(userId));
        await channel.save();
      }
    }
    return res.json({ ok: true, channelId: channel._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to join channel" });
  }
}

const fetchMessages = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 200);
    const beforeId = String(req.query.before || "");

    const query: any = { channelId: id };
    if (beforeId && mongoose.Types.ObjectId.isValid(beforeId)) {
      query._id = { $lt: beforeId };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username email")
      .lean();

    return res.json({ messages, meta: { limit } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
}

export {
  listChannels,
  getChannel,
  createChannel,
  joinChannel,
  fetchMessages,
};