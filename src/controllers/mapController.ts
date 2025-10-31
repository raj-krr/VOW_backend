import { Request, Response } from "express";
import mongoose from "mongoose";
import Map from "../models/map";
import { getRedis } from "../libs/redis";

const redisClient = getRedis();

export const createMap = async (req: Request, res: Response) => {
  try {
    const { name, layoutUrl, rooms, metadata } = req.body;
    const createdBy = (req as any).user?.id || req.header("x-user-id");

    if (!name || !layoutUrl) {
      return res
        .status(400)
        .json({ success: false, msg: "Missing name or layoutUrl" });
    }

    const map = new Map({
      name,
      layoutUrl,
      rooms: rooms || [],
      createdBy,
      metadata,
    });

    await map.save();
    res.status(201).json({ success: true, map });
  } catch (err) {
    console.error("createMap error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getMaps = async (req: Request, res: Response) => {
  try {
    const maps = await Map.find().populate("rooms").sort({ createdAt: -1 });
    res.json({ success: true, maps });
  } catch (err) {
    console.error("getMaps error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getMapById = async (req: Request, res: Response) => {
  try {
    const { mapId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mapId)) {
      return res.status(400).json({ success: false, msg: "Invalid map ID" });
    }

    const map = await Map.findById(mapId).populate("rooms");
    if (!map)
      return res.status(404).json({ success: false, msg: "Map not found" });

    res.json({ success: true, map });
  } catch (err) {
    console.error("getMapById error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


export const getMapPresence = async (req: Request, res: Response) => {
  try {
    const { mapId } = req.params;

    if (!mapId) {
      return res
        .status(400)
        .json({ success: false, msg: "mapId is required" });
    }

    if (!redisClient) {
      console.warn("Redis client unavailable");
      return res.json({ success: true, presence: [] });
    }

    const key = `map:${mapId}:presence`;
    const data = await redisClient.hgetall(key);

    const presence = Object.keys(data || {}).map((userId) => {
      try {
        return JSON.parse(data[userId]);
      } catch {
        return { userId, raw: data[userId] };
      }
    });

    res.json({ success: true, presence });
  } catch (err) {
    console.error("getMapPresence error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


export const deleteMap = async (req: Request, res: Response) => {
  try {
    const { mapId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mapId)) {
      return res.status(400).json({ success: false, msg: "Invalid map ID" });
    }

    const deleted = await Map.findByIdAndDelete(mapId);
    if (!deleted)
      return res.status(404).json({ success: false, msg: "Map not found" });

    res.json({ success: true, msg: "Map deleted successfully" });
  } catch (err) {
    console.error("deleteMap error:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
