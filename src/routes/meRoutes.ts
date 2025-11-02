import express from "express";
import { verifyJWT } from "../middlewares/authmiddleware";
import { updateMeSchema } from "../schemas/me";
import { upload } from "../middlewares/multer";
import { validate }from "../middlewares/validate";
import {
 updateProfileAndAvatar,
  getUserProfile,
  uploadProfilePhoto
} from "../controllers/meControllers";


const meRouter = express.Router();

meRouter.post("/updateprofile", verifyJWT, validate(updateMeSchema), updateProfileAndAvatar);
meRouter.post("/uploadprofile",verifyJWT,upload.single("avatar"),uploadProfilePhoto)
meRouter.get("/info", verifyJWT, getUserProfile);

export default meRouter;
