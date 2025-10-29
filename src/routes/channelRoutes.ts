import express from "express";
import { createChannel, getServerChannels } from "../controllers/channelController";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/", verifyJWT, createChannel);
router.get("/server/:serverId", verifyJWT, getServerChannels);

export default router;
