import multer from "multer";
import path from "path";
import fs from "fs";
import UserModel from "../models/user";


const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    const user = req.user?._id || "guest";
    cb(null, file.fieldname + "-" + user + "-"+ file.originalname  + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, 
});
