import { Router } from "express";
import { upload } from "../middlewares/multer";
import {
  getAllFiles,
  uploadFile,
  deleteFile,
  downloadFile,
  getAllUserWorkspaceFiles
} from "../controllers/fileControllers";
import { verifyJWT } from "../middlewares/authmiddleware";
import { verifyWorkspaceToken } from "../middlewares/workspace.middleware";


const fileRouter = Router();

fileRouter.post("/:workspaceId/upload", verifyJWT, upload.single("file"), uploadFile);
fileRouter.get("/:workspaceId", verifyJWT, getAllFiles);
fileRouter.delete("/delete/:id", verifyJWT, deleteFile);
fileRouter.get("/download/:id", verifyJWT, downloadFile);
fileRouter.get("/all/joined", verifyJWT, getAllUserWorkspaceFiles);


export default fileRouter;
