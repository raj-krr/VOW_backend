import express from "express";
import { scheduleMeeting, getWorkspaceMeetings, deleteMeeting ,updateMeeting} from "../controllers/meetingControllers";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/schedule/:workspaceId", verifyJWT, scheduleMeeting);

router.get("/all", verifyJWT, getWorkspaceMeetings);

router.delete("/:meetingId", verifyJWT, deleteMeeting);

router.put("/update/:meetingId", verifyJWT,updateMeeting);


export default router;
