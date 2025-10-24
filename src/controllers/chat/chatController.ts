import { Request, Response } from "express";
import mongoose from "mongoose";
import Channel from "../../models/chat/channel";
import Message from "../../models/chat/message";

export type RequestWithUser = Request & { user?: { id: string; username?: string } };

const listChannels = async (req: RequestWithUser, res: Response) => {
  try {
    const rawUserId = req.user?.id;
    const userObjectId =
      rawUserId && mongoose.Types.ObjectId.isValid(rawUserId)
        ? new mongoose.Types.ObjectId(rawUserId)
        : null;

    const matchOr: any[] = [{ type: "public" }];
    if (userObjectId) matchOr.push({ type: "private", members: userObjectId });

    const pipeline: any[] = [
      { $match: { $or: matchOr } },

      {
        $lookup: {
          from: "messages",
          let: { cid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$channelId", "$$cid"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { content: 1, sender: 1, createdAt: 1 } },
          ],
          as: "lastMessage",
        },
      },

      {
        $lookup: {
          from: "messages",
          let: { cid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$channelId", "$$cid"] } } },
            { $count: "count" },
          ],
          as: "messageCountArr",
        },
      },

      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
          messageCount: {
            $ifNull: [{ $arrayElemAt: ["$messageCountArr.count", 0] }, 0],
          },
        },
      },

      {
        $project: {
          name: 1,
          slug: 1,
          type: 1,
          members: 1,
          createdAt: 1,
          messageCount: 1,
          lastMessage: 1,
        },
      },

      { $sort: { "lastMessage.createdAt": -1, name: 1 } },
    ];

    const channels = await Channel.aggregate(pipeline).exec();
    return res.json({
      public: channels.filter((c: any) => c.type === "public"),
      private: channels.filter((c: any) => c.type === "private"),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list channels" });
  }
};

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
};

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
};

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
};

const fetchMessages = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 200);
    const beforeId = String(req.query.before || "");

    const channelIdIsObject = mongoose.Types.ObjectId.isValid(id);
    const channelMatchVal = channelIdIsObject
      ? new mongoose.Types.ObjectId(id)
      : id;

    const matchStage: any = { channelId: channelMatchVal };
    if (beforeId && mongoose.Types.ObjectId.isValid(beforeId)) {
      matchStage._id = { $lt: new mongoose.Types.ObjectId(beforeId) };
    }

    const pipeline: any[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "senderDoc",
        },
      },
      { $unwind: { path: "$senderDoc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          content: 1,
          attachments: 1,
          createdAt: 1,
          sender: "$senderDoc._id",
          senderUsername: "$senderDoc.username",
          senderEmail: "$senderDoc.email",
        },
      },
      { $sort: { createdAt: 1 } },
    ];

    const messages = await Message.aggregate(pipeline).exec();
    return res.json({ messages, meta: { limit } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export { listChannels, getChannel, createChannel, joinChannel, fetchMessages };
