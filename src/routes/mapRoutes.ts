import express from "express";
import {
  initBaseMap,
  getBaseMap,
  updateMapLayout,
  updatePresence,
  getPresence,
  removePresence,
} from "../controllers/mapController";

const router = express.Router();

router.post("/init", initBaseMap);
router.get("/", getBaseMap);

router.put("/", updateMapLayout);

router.post("/:workspaceId/presence", updatePresence);

router.get("/:workspaceId/presence", getPresence);
router.delete("/:workspaceId/presence/:userId", removePresence);


export default router;
