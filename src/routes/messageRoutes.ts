import express from "express";
import { sendMessageRest, getChannelMessages } from "../controllers/messageController";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/", verifyJWT, sendMessageRest);
router.get("/channel/:channelId", verifyJWT, getChannelMessages);

export default router;
