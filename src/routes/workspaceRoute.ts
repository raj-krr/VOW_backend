import express from "express";
import { createWorkspace, joinWorkspace,getWorkspaceDetails,rejoinWorkspace,workspaceMembers} from "../controllers/workspaceControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";
import { validate } from "../middlewares/validate";
// import { createWorkspaceSchema, joinWorkspaceSchema } from "../schemas/workspace";

const workspaceRouter = express.Router();

workspaceRouter.post("/create", verifyJWT, createWorkspace);
 workspaceRouter.post("/join", verifyJWT, joinWorkspace);
workspaceRouter.get("/details", verifyJWT, getWorkspaceDetails);

workspaceRouter.get("/workspace/:workspaceId/rejoin", verifyWorkspaceToken,rejoinWorkspace);
workspaceRouter.get("/workspace/:workspaceId/members", verifyWorkspaceToken, workspaceMembers);

export default workspaceRouter;