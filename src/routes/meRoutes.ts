import express from "express";
import { verifyJWT } from "../middlewares/authmiddleware";
import { updateMeSchema } from "../schemas/me";
import { validate }from "../middlewares/validate";
import {
 updateProfileAndAvatar,
  getUserProfile,
} from "../controllers/meControllers";


const meRouter = express.Router();

meRouter.post("/updateprofile", verifyJWT, validate(updateMeSchema), updateProfileAndAvatar);
meRouter.get("/info", verifyJWT, getUserProfile);

export default meRouter;
