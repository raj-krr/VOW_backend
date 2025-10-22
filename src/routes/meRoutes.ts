import express from "express";
import { verifyJWT } from "../middlewares/authmiddleware";
import {
 updateProfileAndAvatar,
  getUserProfile,
} from "../controllers/meControllers";

const meRouter = express.Router();

meRouter.post("/updateprofile", verifyJWT, updateProfileAndAvatar);
meRouter.get("/info", verifyJWT, getUserProfile);

export default meRouter;
