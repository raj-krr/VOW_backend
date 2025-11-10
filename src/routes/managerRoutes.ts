import express from "express";
import {
  createTeam,
  renameTeam,
  removeMember,
  assignSuperviser,
  getAllTeams,
} from "../controllers/teamControllers";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware"; 
import { validate } from "../middlewares/validate";

import { createTeamSchema,renameTeamSchema,assignSuperviserSchema } from "../schemas/team";


const managerRouter = express.Router();

managerRouter.post("/team/create/:workspaceId",validate(createTeamSchema), verifyWorkspaceToken, createTeam);
managerRouter.get("/team/all/:workspaceId",verifyWorkspaceToken,getAllTeams)
managerRouter.put("/team/rename/:workspaceId/:teamId",validate(renameTeamSchema), verifyWorkspaceToken, renameTeam);
managerRouter.put("/team/remove-member/:workspaceId/:teamId", verifyWorkspaceToken, removeMember);
managerRouter.put("/team/assign-lead/:workspaceId/:teamId",validate(assignSuperviserSchema), verifyWorkspaceToken, assignSuperviser);

export default managerRouter;
