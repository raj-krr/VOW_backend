import { Request, Response } from "express";
import Server from "../models/server";

export const createServer = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const ownerId = (req as any).user?._id || req.body.ownerId;
    const server = await Server.create({ name, description, owner: ownerId, members: [ownerId] });
    res.status(201).json(server);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserServers = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req as any).user?._id;
    const servers = await Server.find({ members: userId }).populate("owner", "username email");
    res.json(servers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
