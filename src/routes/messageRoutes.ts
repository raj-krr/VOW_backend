import express from "express";
import { sendMessageRest, getChannelMessages,deleteMessage } from "../controllers/messageController";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/", verifyJWT, sendMessageRest);
router.get("/channel/:channelId", verifyJWT, getChannelMessages);
router.delete("/message/:messageId", deleteMessage);


export default router;
