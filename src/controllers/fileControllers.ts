import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "../libs/s3";
import FileModel from "../models/file";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const bucketName = process.env.AWS_BUCKET_NAME;
    const fileContent = fs.readFileSync(req.file.path);
    const fileKey = `uploads/${Date.now()}-${req.file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: fileContent,
        ContentType: req.file.mimetype,
      })
    );

    const url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const file = await FileModel.create({
      filename: req.file.originalname,
      url,
      s3FileId: fileKey, 
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

export const getAllFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = await FileModel.find().sort({ createdAt: -1 });
    res.status(200).json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch files" });
  }
};

export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const bucketName = process.env.AWS_BUCKET_NAME!;
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: file.s3FileId,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 120});

    res.status(200).json({ url: signedUrl });
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

    const bucketName = process.env.AWS_BUCKET_NAME!;

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: file.s3FileId,
      })
    );

    await FileModel.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};
