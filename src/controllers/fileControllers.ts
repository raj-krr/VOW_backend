import { Request, Response } from "express";
import fs from "fs";
import Workspace from "../models/workspace";
import mongoose, { Types } from "mongoose";
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
    const workspaceId = req.params.workspaceId;
    const userId = String(req.workspaceUser?.userId || req.user?._id);

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ message: "Workspace ID is required" });
      return;
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ message: "Workspace not found" });
      return;
    }

    const isMember = workspace.members.some(
      (memberId: Types.ObjectId) => memberId.toString() === userId
    );

    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this workspace" });
      return;
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ message: "Unsupported file type" });
      return;
    }

    const bucketName = process.env.AWS_BUCKET_NAME!;
    const fileContent = fs.readFileSync(req.file.path);
    const fileKey = `workspaces/${workspaceId}/${Date.now()}-${req.file.originalname}`;

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
      workspace: workspaceId,
      uploadedBy: userId,
    });

    fs.unlinkSync(req.file.path);
    res.status(201).json({ message: "File uploaded successfully", file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "File upload failed" });
  }
};

export const getAllFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.workspaceUser?.userId || req.user?._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ message: "Workspace not found" });
      return;
    }

    const isMember = workspace.members.some(
      (memberId: Types.ObjectId) => memberId.toString() === userId
    );

    if (!isMember) {
      res.status(403).json({ message: "You are not a member of this workspace" });
      return;
    }

    const files = await FileModel.find({ workspace: workspaceId }).sort({ createdAt: -1 });
    res.status(200).json({ workspaceId, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch files" });
  }
};
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileId = req.params.id;
    const userId = String(req.workspaceUser?.userId || req.user?._id || "");

    // 1️⃣ Find the file
    const file = await FileModel.findById(fileId);
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // 2️⃣ Find the workspace linked to this file
    const workspace = await Workspace.findById(file.workspace);
    if (!workspace) {
      res.status(404).json({ message: "Workspace not found for this file" });
      return;
    }

    // 3️⃣ Check if user is uploader or workspace manager (membership irrelevant)
    const isUploader = file.uploadedBy.toString() === userId;
    const isManager = Array.isArray(workspace.manager)
      ? workspace.manager.some(
          (managerId: Types.ObjectId) => managerId.toString() === userId
        )
      : workspace.manager?.toString() === userId;

    if (!isUploader && !isManager) {
      res.status(403).json({ message: "You are not authorized to delete this file" });
      return;
    }

    // 4️⃣ Delete file from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: file.s3FileId,
      })
    );

    // 5️⃣ Delete file from DB
    await file.deleteOne();

    res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ message: "File deletion failed" });
  }
};

export const getAllUserWorkspaceFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    const workspaces = await Workspace.find({ members: userId }).select("_id name");
    if (!workspaces.length) {
      res.status(200).json({ message: "No workspaces joined yet", files: [] });
      return;
    }

    const workspaceIds = workspaces.map((ws) => ws._id);

    const files = await FileModel.find({ workspace: { $in: workspaceIds } })
      .populate("workspace", "workspaceName")
      .populate("uploadedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Fetched all files from joined workspaces",
      total: files.length,
      files,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user workspace files" });
  }
};
