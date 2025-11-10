import express from "express";
import { scheduleMeeting, getWorkspaceMeetings, deleteMeeting ,updateMeeting} from "../controllers/meetingControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { validate } from "../middlewares/validate";
import { scheduleMeetingSchema, updateMeetingSchema } from "../schemas/meeting";

const router = express.Router();

router.post("/schedule/:workspaceId",validate(scheduleMeetingSchema), verifyJWT, scheduleMeeting);

router.get("/all", verifyJWT, getWorkspaceMeetings);

router.delete("/:meetingId", verifyJWT, deleteMeeting);

router.put("/update/:meetingId",validate(updateMeetingSchema), verifyJWT,updateMeeting);


export default router;
