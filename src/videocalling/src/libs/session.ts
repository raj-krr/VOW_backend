import session from "express-session";
import Redis from "ioredis";
import { RedisStore } from "connect-redis";
import type { Server } from "socket.io";

const redisClient = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

const store = new RedisStore({
  client: redisClient,
  prefix: "sess:",
});

export const sessionMiddleware = session({
  store,
  name: process.env.SESSION_COOKIE_NAME || "sid",
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
});

export function wrapSessionForSocketIO(io: Server) {
  io.use((socket, next) => {
    // @ts-ignore
    sessionMiddleware(socket.request as any, {} as any, next);
  });
}

export { redisClient as redis };
