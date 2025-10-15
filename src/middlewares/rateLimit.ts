import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import { Request, Response, NextFunction } from "express";

export const ipLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, msg: "Too many requests from this IP, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const EMAIL_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_MAX = 1;

let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

const emailMap = new Map<string, number>();

export async function emailThrottle(req: Request, res: Response, next: NextFunction) {
  try {
    const email = (req.body?.email || "").toLowerCase().trim();
    if (!email) return next();

    const key = `reg:${email}`;

    if (redis) {
      const attempts = await redis.incr(key);
      if (attempts === 1) {
        await redis.pexpire(key, EMAIL_WINDOW_MS);
      }
      if (attempts > EMAIL_MAX) {
        return res.status(429).json({ success: false, msg: "Too many registration attempts for this email. Try again later." });
      }
    } else {
      const now = Date.now();
      const last = emailMap.get(key) || 0;
      if (last && now - last < EMAIL_WINDOW_MS) {
        return res.status(429).json({ success: false, msg: "Too many registration attempts for this email. Try again later." });
      }
      emailMap.set(key, now);
      setTimeout(() => emailMap.delete(key), EMAIL_WINDOW_MS);
    }
    return next();
  } catch (err) {
    return next();
  }
}
