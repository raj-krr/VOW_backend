import express from "express";
import {
  renameTeam,
  removeMember,
  getAllTeams,
  getTeamMembers,
} from "../controllers/teamControllers";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";  
import { validate} from "../middlewares/validate";
import { renameTeamSchema } from "../schemas/team";
const superviserRouter = express.Router();

superviserRouter.get("/team/members/:teamId",getTeamMembers);
superviserRouter.get("/team/all/:workspaceId",verifyWorkspaceToken,getAllTeams);
superviserRouter.put("/team/rename/:workspaceId/:teamId",validate(renameTeamSchema), verifyWorkspaceToken, renameTeam);
superviserRouter.put("/team/remove-member/:workspaceId/:teamId", verifyWorkspaceToken, removeMember);

export default superviserRouter;
