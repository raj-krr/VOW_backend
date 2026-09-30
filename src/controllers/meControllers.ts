import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { ApiError } from "../utils/ApiError";
import fs from "fs";
import path from "path";
import cloudinary from "../libs/cloudinary";

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

    const allowedMimeTypes =[
      "image/jpeg",
      "image/png",
      "image/svg"
    ];

    if (!allowedMimeTypes.includes(req.file.mimetype)){
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(400).json({message:"only image is used as profile photo"});
      return;
    }

    let photoUrl = "";

    const hasCloudinaryKeys =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name" &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_KEY !== "your_api_key";

    if (hasCloudinaryKeys) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: `user_avatars/${userId}`,
          resource_type: "image",
        });
        photoUrl = result.secure_url;
      } catch (cloudErr) {
        console.warn("[uploadProfilePhoto] Cloudinary error, falling back:", cloudErr);
      }
    }

    if (!photoUrl) {
      const buffer = fs.readFileSync(req.file.path);
      const base64 = buffer.toString("base64");
      photoUrl = `data:${req.file.mimetype};base64,${base64}`;
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

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
