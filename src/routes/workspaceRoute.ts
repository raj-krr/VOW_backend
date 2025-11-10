import express from "express";
import { createWorkspace, joinWorkspace,getWorkspaceDetails,rejoinWorkspace,workspaceMembers,deleteWorkspace} from "../controllers/workspaceControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";
import { validate } from "../middlewares/validate";
import { createWorkspaceSchema, joinWorkspaceSchema } from "../schemas/workspace";

const workspaceRouter = express.Router();

workspaceRouter.post("/create",validate(createWorkspaceSchema), verifyJWT, createWorkspace);
 workspaceRouter.post("/join",validate(joinWorkspaceSchema), verifyJWT, joinWorkspace);
workspaceRouter.get("/details", verifyJWT, getWorkspaceDetails);

workspaceRouter.delete("/:workspaceId",verifyJWT,deleteWorkspace);
workspaceRouter.get("/:workspaceId/rejoin", verifyWorkspaceToken,rejoinWorkspace);
workspaceRouter.get("/:workspaceId/members", verifyWorkspaceToken, workspaceMembers);

export default workspaceRouter;