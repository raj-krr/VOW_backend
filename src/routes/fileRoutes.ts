import { Router } from "express";
import { upload } from "../middlewares/multer";
import {
  getAllFiles,
  uploadFile,
  deleteFile,
  getAllUserWorkspaceFiles
} from "../controllers/fileControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";


const fileRouter = Router();

fileRouter.post("/:workspaceId/upload", verifyJWT, upload.single("file"), uploadFile);
fileRouter.get("/:workspaceId", verifyJWT, getAllFiles);
fileRouter.delete("/delete/:id", verifyJWT, deleteFile);
fileRouter.get("/all/joined", verifyJWT, getAllUserWorkspaceFiles);


export default fileRouter;
