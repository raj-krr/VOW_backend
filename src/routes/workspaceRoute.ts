import express from "express";
import { createWorkspace} from "../controllers/workspaceControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { validate } from "../middlewares/validate";
import { createWorkspaceSchema, joinWorkspaceSchema } from "../schemas/workspace";

const workspaceRouter = express.Router();

workspaceRouter.post("/create", verifyJWT, validate(createWorkspaceSchema), createWorkspace);
// workspaceRouter.post("/join", verifyJWT, validate(joinWorkspaceSchema), joinWorkspace);
// workspaceRouter.get("/details", verifyJWT, getWorkspaceDetails);

export default workspaceRouter;