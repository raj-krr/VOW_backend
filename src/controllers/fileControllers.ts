import { Request, Response } from "express";
import { cloudinary } from "../libs/cloudinary";
import FileModel from "../models/file";
import fs from "fs";

export const getAllFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = await FileModel.find().sort({ createdAt: -1 });
    res.status(200).json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch files" });
  }
};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "file_sharing_app",
      resource_type: "auto",
    });

    const file = await FileModel.create({
      filename: `${req.file.originalname}-${Date.now()}`,
      url: result.secure_url,
      cloudinaryId: result.public_id,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });

    fs.unlinkSync(req.file.path); 

    res.status(201).json({ message: "File uploaded successfully", file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }
    // res.redirect(file.url);
    res.status(200).json({ url: file.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Download failed" });
  }
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    let resourceType = "image";
    if (file.mimeType.startsWith("video")) resourceType = "video";
    else if (file.mimeType.startsWith("application") || file.mimeType.startsWith("text"))
      resourceType = "raw";

    const result = await cloudinary.uploader.destroy(file.cloudinaryId, {
      resource_type: resourceType,
    });
    console.log("Cloudinary delete result:", result);

    await FileModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};
