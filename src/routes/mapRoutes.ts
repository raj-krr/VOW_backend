import express from "express";
import {
  createMap,
  getMaps,
  getMapById,
  getMapPresence,
  deleteMap,
} from "../controllers/mapController";

const router = express.Router();

router.post("/", createMap);

router.get("/", getMaps);

router.get("/:mapId", getMapById);

router.get("/:mapId/presence", getMapPresence);

router.delete("/:mapId", deleteMap);

export default router;
