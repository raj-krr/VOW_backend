import express from "express";
import * as roomsController from "../controllers/rooms";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.get("/rooms", verifyJWT, roomsController.listRooms);
router.get("/rooms/by-slug/:slug", verifyJWT, roomsController.getRoom);
router.get("/rooms/:id", verifyJWT, roomsController.getRoom);


router.post("/rooms/:id/join", verifyJWT, roomsController.joinRoom);
router.post("/rooms/:id/leave", verifyJWT, roomsController.leaveRoom);
router.get("/rooms/:id/presence", verifyJWT, roomsController.getRoomPresence);

export default router;
