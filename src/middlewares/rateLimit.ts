import {rateLimit} from "express-rate-limit";
import { Request } from "express";


export const ipLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100,
  skip: (req) => {
    if (req.path && req.path.startsWith("/videochat")) return true;
    if (req.ip === "127.0.0.1" || req.ip === "::1") return true;
    return false;
  },
  message: {
    success: false,
    msg: "Too many requests from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});



export const emailLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, 
  max: 5,
  message: {
    success: false,
    msg: "Too many email requests. Try again in 2 minutes.",
  },
  keyGenerator: (req: Request) => {
    const email = (req.body?.email || "").toLowerCase().trim();
    return email;
  },
  standardHeaders: true,
  legacyHeaders: false,
});
