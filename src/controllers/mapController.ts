import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Map from "../models/map";
import { getRedis } from "../libs/redis";

const redisClient = getRedis();


export const initBaseMap = async (req: Request, res: Response) => {
  try {
    const existingMap = await Map.findOne();
    if (existingMap) {
      return res.json({
        success: true,
        msg: "Base map already exists",
        map: existingMap,
      });
    }

    const layoutPath = path.join(__dirname, "../../data/baseMap.json");
    const layoutData = JSON.parse(fs.readFileSync(layoutPath, "utf8"));

    const newMap = new Map({
      name: layoutData.name || "Base Office Map",
      dimensions: layoutData.dimensions,
      rooms: layoutData.rooms,
      objects: layoutData.objects,
      metadata: { initializedAt: new Date() },
    });

    await newMap.save();
    return res
      .status(201)
      .json({ success: true, msg: "Base map created", map: newMap });
  } catch (err) {
    console.error("initBaseMap error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

/**
 * Get the base map details (rooms, objects, etc.)
 */
export const getBaseMap = async (_req: Request, res: Response) => {
  try {
    const map = await Map.findOne();
    if (!map)
      return res
        .status(404)
        .json({ success: false, msg: "Base map not initialized" });

    return res.json({ success: true, map });
  } catch (err) {
    console.error("getBaseMap error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};


export const updatePresence = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { userId, x, y, roomId, name, avatarUrl } = req.body;

    if (!workspaceId || !userId)
      return res
        .status(400)
        .json({ success: false, msg: "workspaceId and userId are required" });

    if (!redisClient)
      return res
        .status(500)
        .json({ success: false, msg: "Redis client not available" });

    const key = `map:${workspaceId}:presence`;
    const payload = JSON.stringify({
      userId,
      x,
      y,
      roomId,
      name,
      avatarUrl,
      updatedAt: Date.now(),
    });

    await redisClient.hset(key, userId, payload);
    await redisClient.expire(key, 60 * 30); // expire after 30 minutes inactivity

    return res.json({ success: true, msg: "Presence updated" });
  } catch (err) {
    console.error("updatePresence error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getPresence = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId)
      return res
        .status(400)
        .json({ success: false, msg: "workspaceId is required" });

    if (!redisClient)
      return res
        .status(500)
        .json({ success: false, msg: "Redis client not available" });

    const key = `map:${workspaceId}:presence`;
    const data = await redisClient.hgetall(key);

    const presence = Object.keys(data || {}).map((userId) => {
      try {
        return JSON.parse(data[userId]);
      } catch {
        return { userId, raw: data[userId] };
      }
    });

    return res.json({ success: true, presence });
  } catch (err) {
    console.error("getPresence error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const removePresence = async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;

    if (!workspaceId || !userId)
      return res
        .status(400)
        .json({ success: false, msg: "workspaceId and userId required" });

    if (!redisClient)
      return res
        .status(500)
        .json({ success: false, msg: "Redis client not available" });

    const key = `map:${workspaceId}:presence`;
    await redisClient.hdel(key, userId);

    return res.json({ success: true, msg: "User presence removed" });
  } catch (err) {
    console.error("removePresence error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};
