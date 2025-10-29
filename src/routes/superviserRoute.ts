import express from "express";
import {
  renameTeam,
  removeMember,
  getAllTeams,
} from "../controllers/teamControllers";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";  

const superviserRouter = express.Router();

superviserRouter.get("/team/all/:workspaceId",verifyWorkspaceToken,getAllTeams);
superviserRouter.put("/team/rename/:workspaceId/:teamId", verifyWorkspaceToken, renameTeam);
superviserRouter.put("/team/remove-member/:workspaceId/:teamId", verifyWorkspaceToken, removeMember);

export default superviserRouter;
