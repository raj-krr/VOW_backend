import express from "express";
import {
  initBaseMap,
  getBaseMap,
  updatePresence,
  getPresence,
  removePresence,
} from "../controllers/mapController";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/init",verifyJWT, initBaseMap);
router.get("/",verifyJWT, getBaseMap);
router.post("/:workspaceId/presence", updatePresence);
router.get("/:workspaceId/presence", getPresence);
router.delete("/:workspaceId/presence/:userId", removePresence);


export default router;
