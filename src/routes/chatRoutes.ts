import express from "express";
import {listChannels , getChannel, joinChannel, createChannel, fetchMessages, RequestWithUser} from "../controllers/chat/chatController";
import { createMessage } from "../controllers/chat/messageController";
import { verifyJWT } from "../middlewares/authmiddleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

router.get("/channels", verifyJWT, asyncHandler<RequestWithUser>(listChannels));
router.get("/channels/:id", verifyJWT, asyncHandler<RequestWithUser>(getChannel));
router.post("/channels/:id/join", verifyJWT, asyncHandler<RequestWithUser>(joinChannel));

router.post("/admin/channels", verifyJWT, asyncHandler<RequestWithUser>(createChannel));

router.get("/channels/:id/messages", verifyJWT, asyncHandler<RequestWithUser>(fetchMessages));
router.post("/messages", verifyJWT, asyncHandler<RequestWithUser>(createMessage));

export default router;
