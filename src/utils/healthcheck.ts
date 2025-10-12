import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Redis from "ioredis";
import { asyncHandler } from "./asyncHandler";

export type CheckResult = { ok: boolean; details?: any };

const withTimeout = async <T>(p: Promise<T>, ms = 500): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });

export async function checkMongoose(msTimeout = 400): Promise<CheckResult> {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { ok: false, details: { readyState: mongoose.connection.readyState } };
    }
    if (!mongoose.connection.db) {
      return { ok: false, details: "no-db-object" };
    }

    const ping = await withTimeout(mongoose.connection.db.admin().ping(), msTimeout);
    return { ok: true, details: ping };
  } catch (err: any) {
    return { ok: false, details: err?.message ?? err };
  }
}

export function ensureHealthy(opts: {
  redisClient?: Redis;
  failStatus?: number;
  checks?: { db?: boolean; redis?: boolean };
  allowDegraded?: boolean;
} = {}) {
  const { redisClient, failStatus = 503, checks = { db: true }, allowDegraded = false } = opts;

  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const results: Record<string, CheckResult> = {};
    let allOk = true;

    if (checks.db) {
      const r = await checkMongoose();
      results.db = r;
      if (!r.ok) allOk = false;
    }

    if (!allOk && allowDegraded && req.method === "GET") {
      (req as any).healthCheckpoint = { ok: false, results };
      res.setHeader("X-Service-Degraded", "true");
      return next();
    }

    if (!allOk) {
      return res.status(failStatus).json({
        ok: false,
        message: "service_unavailable",
        reason: "health_check_failed",
        checks: results,
        timestamp: new Date().toISOString(),
      });
    }

    (req as any).healthCheckpoint = { ok: true, results };
    return next();
  });
}
