import express from "express";
import {
  sendDirectMessage,
  getDirectMessages,
  deleteDirectMessage,
} from "../controllers/directMessageController";

import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/:workspaceId/:user1/:user2", verifyJWT,sendDirectMessage);

router.get("/:workspaceId/:user1/:user2", getDirectMessages);

router.delete("/:messageId", deleteDirectMessage);

export default router;
