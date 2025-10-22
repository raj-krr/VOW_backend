import { Router } from "express";
import { upload } from "../middlewares/multer";
import {
  getAllFiles,
  uploadFile,
  downloadFile,
  deleteFile,
} from "../controllers/fileControllers";

const fileRouter = Router();

fileRouter.get("/", getAllFiles);
fileRouter.post("/upload", upload.single("file"), uploadFile);
fileRouter.get("/download/:id", downloadFile);
fileRouter.delete("/delete/:id", deleteFile);

export default fileRouter;
