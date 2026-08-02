import express from "express";
import {
  createTeam,
  renameTeam,
  removeMember,
  assignSuperviser,
  getAllTeams,
  addMembers,
  deleteTeam,
} from "../controllers/teamControllers";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware"; 
import { validate } from "../middlewares/validate";

import { createTeamSchema, renameTeamSchema, assignSuperviserSchema } from "../schemas/team";

const managerRouter = express.Router();

managerRouter.post("/team/create/:workspaceId", verifyWorkspaceToken, validate(createTeamSchema), createTeam);
managerRouter.get("/team/all/:workspaceId", verifyWorkspaceToken, getAllTeams);
managerRouter.put("/team/rename/:workspaceId/:teamId", verifyWorkspaceToken, validate(renameTeamSchema), renameTeam);
managerRouter.put("/team/remove-member/:workspaceId/:teamId", verifyWorkspaceToken, removeMember);
managerRouter.put("/team/assign-lead/:workspaceId/:teamId", verifyWorkspaceToken, validate(assignSuperviserSchema), assignSuperviser);
managerRouter.put("/team/add-members/:workspaceId/:teamId", verifyWorkspaceToken, addMembers);
managerRouter.delete("/team/:workspaceId/:teamId", verifyWorkspaceToken, deleteTeam);

export default managerRouter;
