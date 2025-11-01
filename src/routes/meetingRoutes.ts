import express from "express";
import { scheduleMeeting, getWorkspaceMeetings, deleteMeeting } from "../controllers/meetingControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";

const router = express.Router();

router.post("/schedule/:workspaceId", verifyJWT, verifyWorkspaceToken, scheduleMeeting);

router.get("/:workspaceId", verifyJWT, verifyWorkspaceToken, getWorkspaceMeetings);

router.delete("/:workspaceId/:meetingId", verifyJWT, verifyWorkspaceToken, deleteMeeting);

export default router;
