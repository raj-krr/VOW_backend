import { Request, Response } from "express";
import Room from "../models/room";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getRedis } from "../libs/redis";

// Config
const ROOM_TOKEN_TTL = 60;
const JWT_ROOM_SECRET = process.env.JWT_ROOM_SECRET as string;
// const REDIS_URL = process.env.REDIS_URL;
const PRESENCE_TTL = 60;

// for presence

const redisClient = getRedis();

// Room token generator
export const makeRoomToken = (
  roomId: string,
  userId: string,
  opts?: {
    ttlSeconds?: number;
    role?: string;
    sessionId?: string;
    displayName?: string;
    [k: string]: any;
  }
) => {
  const ttl = opts?.ttlSeconds ?? ROOM_TOKEN_TTL;
  const base: any = { roomId, sub: userId };

  if (opts?.role) base.role = opts.role;
  if (opts?.sessionId) base.sessionId = opts.sessionId;
  if (opts?.displayName) base.displayName = opts.displayName;

  Object.keys(opts || {}).forEach((k) => {
    if (["ttlSeconds", "role", "sessionId", "displayName"].includes(k)) return;
    base[k] = (opts as any)[k];
  });

  return jwt.sign(base, JWT_ROOM_SECRET, { expiresIn: ttl });
};

const presenceKey = (roomId: string) => `room:${roomId}:presence`;

const addPresence = async (
  roomId: string,
  userId: string,
  data: Record<string, any>
) => {
  if (!redisClient) return;
  const key = presenceKey(roomId);
  await redisClient.hset(
    key,
    userId,
    JSON.stringify({ ...data, ts: Date.now() })
  );
  await redisClient.expire(key, PRESENCE_TTL);
};

const removePresence = async (roomId: string, userId: string) => {
  if (!redisClient) return;
  const key = presenceKey(roomId);
  await redisClient.hdel(key, userId);
};

const listPresence = async (roomId: string) => {
  if (!redisClient) return [] as any[];
  const key = presenceKey(roomId);
  const raw = await redisClient.hgetall(key);
  return Object.keys(raw).map((uid) => {
    try {
      const parsed = JSON.parse(raw[uid]);
      return { userId: uid, ...parsed };
    } catch (e) {
      return { userId: uid, raw: raw[uid] };
    }
  });
};

const getUserId = (req: Request) => {
  if ((req as any).user && (req as any).user.id) return (req as any).user.id;
  const header = req.header("x-user-id");
  return header || null;
};

// List rooms
export const listRooms = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ success: false, msg: "Unauthorized" });

    const mine = String(req.query.mine || "").toLowerCase() === "true";
    const baseQuery = { isPrivate: false };
    const query = mine
      ? { $or: [baseQuery, { createdBy: userId }] }
      : baseQuery;

    const rooms = await Room.find(query).sort({ createdAt: -1 }).limit(200);
    return res.json({ success: true, rooms });
  } catch (err) {
    console.error("listRooms error:", err);
    return res.status(500).json({ success: false, msg: "server error" });
  }
};

// Get room by ID or slug
export const getRoom = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { id, slug } = req.params as any;
    let room = null;

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id))
        return res.status(400).json({ success: false, msg: "invalid id" });
      room = await Room.findById(id);
    } else if (slug) {
      room = await Room.findOne({ slug });
    } else {
      return res
        .status(400)
        .json({ success: false, msg: "id or slug required" });
    }

    if (!room)
      return res.status(404).json({ success: false, msg: "room not found" });

    // private rooms
    if (room.isPrivate && String(room.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, msg: "forbidden" });
    }

    return res.json({ success: true, room });
  } catch (err) {
    console.error("getRoom error:", err);
    return res.status(500).json({ success: false, msg: "server error" });
  }
};

// Join a room
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { id } = req.params;
    const {
      displayName,
      role = "participant",
      sessionId,
      ...customClaims
    } = req.body ?? {};

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, msg: "invalid id" });

    const room = await Room.findById(id);
    if (!room)
      return res.status(404).json({ success: false, msg: "room not found" });

    const tokenOpts: any = { ttlSeconds: ROOM_TOKEN_TTL, role, displayName };
    if (sessionId) tokenOpts.sessionId = sessionId;
    Object.assign(tokenOpts, customClaims || {});

    const token = makeRoomToken(String(room._id), String(userId), tokenOpts);

    try {
      await addPresence(String(room._id), String(userId), {
        displayName,
        role,
      });
    } catch (e) {
      console.error("presence add error:", e);
    }

    return res.json({
      success: true,
      token,
      ttlSeconds: ROOM_TOKEN_TTL,
      roomId: room._id,
      displayName,
      role,
    });
  } catch (err) {
    console.error("joinRoom error:", err);
    return res.status(500).json({ success: false, msg: "server error" });
  }
};

// Leave a room
export const leaveRoom = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { id } = req.params;
    try {
      await removePresence(String(id), String(userId));
    } catch (e) {
      console.error("presence remove error:", e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("leaveRoom error:", err);
    return res.status(500).json({ success: false, msg: "server error" });
  }
};

// Get room presence
export const getRoomPresence = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ success: false, msg: "Unauthorized" });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, msg: "invalid id" });

    const room = await Room.findById(id);
    if (!room)
      return res.status(404).json({ success: false, msg: "room not found" });

    if (room.isPrivate && String(room.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, msg: "forbidden" });
    }

    const list = await listPresence(String(id));
    return res.json({ success: true, presence: list });
  } catch (err) {
    console.error("getRoomPresence error:", err);
    return res.status(500).json({ success: false, msg: "server error" });
  }
};
