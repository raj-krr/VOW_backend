import { Request, Response } from "express";
import fs from "fs";
import Workspace from "../models/workspace";
import mongoose, { Types } from "mongoose";
import cloudinary from "../libs/cloudinary";
import FileModel from "../models/file";

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

    const memberIds = workspace.members.map((m: any) =>
      typeof m === "object" && m ? (m._id || m.id || m).toString() : String(m)
    );
    const isMember =
      memberIds.includes(String(userId)) ||
      String(workspace.manager) === String(userId) ||
      String((workspace as any).createdBy) === String(userId);

    if (!isMember) {
      console.warn(`[uploadFile] Member check warning for user ${userId} in workspace ${workspaceId}`);
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
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({ message: "Unsupported file type" });
      return;
    }

    let fileUrl = "";
    let publicId = "";

    const hasCloudinaryKeys =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== "your_api_key";

    if (hasCloudinaryKeys) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: `vow_workspaces/${workspaceId}`,
          resource_type: "auto",
        });
        fileUrl = result.secure_url;
        publicId = result.public_id;
      } catch (cloudErr) {
        console.warn("[uploadFile] Cloudinary upload warning, falling back:", cloudErr);
      }
    }

    if (!fileUrl) {
      const buffer = fs.readFileSync(req.file.path);
      const base64 = buffer.toString("base64");
      fileUrl = `data:${req.file.mimetype};base64,${base64}`;
      publicId = `local-${Date.now()}`;
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    const file = await FileModel.create({
      filename: req.file.originalname,
      url: fileUrl,
      cloudinaryPublicId: publicId,
      s3FileId: publicId,
      size: req.file.size,
      mimeType: req.file.mimetype,
      workspace: workspaceId,
      uploadedBy: userId,
    });

    res.status(201).json({ message: "File uploaded successfully", file });
  } catch (err) {
    console.error("File upload error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

    const file = await FileModel.findById(fileId);
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const workspace = await Workspace.findById(file.workspace);
    if (!workspace) {
      res.status(404).json({ message: "Workspace not found for this file" });
      return;
    }

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

    const publicId = file.cloudinaryPublicId || file.s3FileId;
    if (publicId && !publicId.startsWith("local-")) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
      } catch (cloudErr) {
        console.warn("Cloudinary delete warning:", cloudErr);
      }
    }

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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const workspaces = await Workspace.find({ members: userId }).select("_id name");
    if (!workspaces.length) {
      res.status(200).json({ message: "No workspaces joined yet", files: [] });
      return;
    }

    const workspaceIds = workspaces.map((ws) => ws._id);

    const [files, total] = await Promise.all([
      FileModel.find({ workspace: { $in: workspaceIds } })
        .populate("workspace", "workspaceName")
        .populate("uploadedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FileModel.countDocuments({ workspace: { $in: workspaceIds } })
    ]);

    res.status(200).json({
      message: "Fetched paginated files",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      files,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user workspace files" });
  }
};
