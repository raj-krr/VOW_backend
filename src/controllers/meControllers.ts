import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { ApiError } from "../utils/ApiError";

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


const updateProfileAndAvatar = async (req: Request, res: Response) : Promise<void>=> {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { fullName, organisation, gender, dob } = req.body;

    const avatarSeeds: Record<string, string[]> = {
      male: ["BraveKnight", "IronGuardian", "ForestHunter", "CaptainBold", "ShadowSamurai"],
      female: ["MysticQueen", "CrimsonValkyrie", "MoonSorceress", "GoldenRanger", "StarEmpress"],
      other: ["SkyDreamer", "CyberNomad", "CosmicTraveler", "PeaceMaker", "LightBearer"],
    };

    const genderKey = gender?.toLowerCase() || "other";
    const seedList = avatarSeeds[genderKey] || avatarSeeds.other;

    const index = Array.from(userId.toString())
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) % seedList.length;
    const deterministicSeed = seedList[index];

    const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${deterministicSeed}`;

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

export { updateProfileAndAvatar, getUserProfile };
