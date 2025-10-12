import express, { Router } from "express";
import { ensureHealthy } from "../utils/healthcheck";

const router: Router = express.Router();

router.get(
  "/health",
  ensureHealthy({ checks: { db: true } }),
  (req, res) => {
    res.json({
      ok: true,
      service: "API",
      message: "Service is healthy",
      timestamp: new Date().toISOString(),
    });
  }
);

export default router;
