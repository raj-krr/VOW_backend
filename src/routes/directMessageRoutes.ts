import express from "express";
import {
  getDirectMessages,
  deleteDirectMessage,
} from "../controllers/directMessageController";

const router = express.Router();

router.get("/:workspaceId/:user1/:user2", getDirectMessages);

router.delete("/:messageId", deleteDirectMessage);

export default router;
