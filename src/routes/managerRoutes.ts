import express from "express";
import {
  createTeam,
  renameTeam,
  removeMember,
  assignSuperviser,
  getAllTeams,
} from "../controllers/teamControllers";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware"; 

const managerRouter = express.Router();

managerRouter.post("/team/create/:workspaceId", verifyWorkspaceToken, createTeam);
managerRouter.get("/team/all/:workspaceId",verifyWorkspaceToken,getAllTeams)
managerRouter.put("/team/rename/:workspaceId/:teamId", verifyWorkspaceToken, renameTeam);
managerRouter.put("/team/remove-member/:workspaceId/:teamId", verifyWorkspaceToken, removeMember);
managerRouter.put("/team/assign-lead/:workspaceId/:teamId", verifyWorkspaceToken, assignSuperviser);

export default managerRouter;
