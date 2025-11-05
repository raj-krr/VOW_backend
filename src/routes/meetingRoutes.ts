import express from "express";
import { scheduleMeeting, getWorkspaceMeetings, deleteMeeting ,updateMeeting} from "../controllers/meetingControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";

const router = express.Router();

router.post("/schedule/:workspaceId", verifyJWT, verifyWorkspaceToken, scheduleMeeting);

router.get("/:workspaceId", verifyJWT, verifyWorkspaceToken, getWorkspaceMeetings);

router.delete("/:workspaceId/:meetingId", verifyJWT, verifyWorkspaceToken, deleteMeeting);

router.put("/update/:workspaceId/:meetingId", verifyJWT,verifyWorkspaceToken,updateMeeting);


export default router;
