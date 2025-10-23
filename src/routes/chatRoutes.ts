import express from "express";
import {listChannels , getChannel, joinChannel, createChannel, fetchMessages} from "../controllers/chat/chatController";
import { createMessage } from "../controllers/chat/messageController";
import { verifyJWT } from "../middlewares/authmiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

router.get("/channels", verifyJWT, asyncHandler(listChannels));
router.get("/channels/:id", verifyJWT, asyncHandler(getChannel));
router.post("/channels/:id/join", verifyJWT, asyncHandler(joinChannel));

router.post("/admin/channels", verifyJWT, asyncHandler(createChannel));

router.get("/channels/:id/messages", verifyJWT, asyncHandler(fetchMessages));
router.post("/messages", verifyJWT, asyncHandler(createMessage));

export default router;
