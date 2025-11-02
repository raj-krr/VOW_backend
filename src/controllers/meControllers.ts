import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { ApiError } from "../utils/ApiError";
import fs from "fs";
import path from "path";
import {
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { s3 } from "../libs/s3";

const sanitizeUser = (userDoc: IUser) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.refreshToken;
  delete user.resetOtp;
  delete user.resetOtpExpires;
  delete user.verificationCode;
  delete user.verificationCodeExpires;
  delete user.__v;
  return user;
};

 const updateProfileAndAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { fullName, organisation, gender, dob } = req.body;

    const avatarFolders: Record<string, string[]> = {
      male: ["Boy05.png", "Boy06.png", "Boy13.png", "Boy14.png", "Boy18.png", "Boy19.png", "Boy20.png","Boy02.png"],
      female: ["Girl08.png", "Girl01.png", "Girl11.png", "Girl19.png", "Girl18.png", "Girl04.png", "Girl06.png", "Girl14.png", "Girl03.png"],
      other: ["avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png", "avatar5.png"],
    };

    const genderKey = gender?.toLowerCase() || "other";
    const fileList = avatarFolders[genderKey] || avatarFolders.other;


    const index = Array.from(userId.toString())
      .reduce((sum, c) => sum + c.charCodeAt(0), 0) % fileList.length;

    const avatarUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${genderKey}/${fileList[index]}`;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { fullName, organisation, gender: genderKey, dob, avatar: avatarUrl },
      { new: true }
    ).select("-password -refreshToken");

    res.status(200).json({
      success: true,
      msg: "Profile and avatar updated successfully",
      data: sanitizeUser(updatedUser as IUser),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

 const uploadProfilePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized user");

    if (!req.file) throw new ApiError(400, "No file uploaded");

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname);
    const fileKey = `user-avatars/${userId}/profile-${fileExt}`;

    // Upload to S3
    const fileContent = fs.readFileSync(filePath);
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileKey,
      Body: fileContent,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    fs.unlinkSync(filePath);

    const photoUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { avatar: photoUrl },
      { new: true }
    ).select("-password -refreshToken");

    res.status(200).json({
      success: true,
      msg: "Profile photo uploaded successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      msg: "Image upload failed",
      error: error instanceof Error ? error.message : error,
    });
  }
};

const getUserProfile = async (req: Request, res: Response) :Promise<void>=> {
  try {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    res.status(200).json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export { updateProfileAndAvatar, getUserProfile ,uploadProfilePhoto};
