import { Request, Response } from "express";
import Channel from "../models/channel";

export const createChannel = async (req: Request, res: Response) => {
  try {
    const { name, type = "text", workspaceId, members = [] } = req.body;
    const channel = await Channel.create({ name, type, server: workspaceId, members });
    res.status(201).json(channel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getServerChannels = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const channels = await Channel.find({ server: workspaceId }).populate("members", "username avatar");
    res.json(channels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
