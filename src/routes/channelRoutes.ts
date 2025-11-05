import express from "express";
import { createChannel, deleteChannel, getServerChannels, updateChannelName } from "../controllers/channelController";
import { verifyJWT } from "../middlewares/authmiddleware";
import { DeleteBucketCorsCommand } from "@aws-sdk/client-s3";

const router = express.Router();

router.post("/", verifyJWT, createChannel);
router.get("/workspace/:workspaceId", verifyJWT, getServerChannels);
router.delete("/:channelId",verifyJWT, deleteChannel);
router.put("/:channelId", updateChannelName);
export default router;
