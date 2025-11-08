import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { sendVerificationCode, welcomeEmail, sendResetOtpEmail } from "../middlewares/email";
import { generateOtp } from "../utils/otp";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { options } from "../constant"
import { de } from "zod/v4/locales";


const sanitizeUser = (userDoc: IUser) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.refreshToken;
  delete user.resetOtp;
  delete user.resetOtpExpires;
  delete user.verificationCode;
  delete user.verificationCodeExpires;
  delete user.__v;
  delete user.accessToken;
  delete user.username;
  delete user.gender;
  delete user.organisation;
  delete user.avatar;
  delete user.fullName;
  delete user.dob;
  delete user.refreshTokenExpires;
  return user;
};

// REGISTER
const register = async (req: Request<{}, {}, IUser>, res: Response) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ success: false, msg: "Missing required fields" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
  const conflict = await UserModel.findOne({
    isVerified: true,
    $or: [
      { email: normalizedEmail },
      { username: username }
    ]
  }).select('email username').lean();

  if (conflict) {
    if (conflict.email === normalizedEmail) {
      return res.status(400).json({ success: false, msg: 'Email already in use' });
    }
    if (conflict.username === username) {
      return res.status(400).json({ success: false, msg: 'Username already taken' });
    }
  }

} catch (err) {
  console.error(err);
  return res.status(500).json({ success: false, msg: 'Server error' });
}

  const verificationCode = generateOtp(6);
  const verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  let user = await UserModel.findOne({ email: normalizedEmail, isVerified: false });

  if (user) {
    // Update fields
    user.username = username;
    user.password = password;
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    user.updatedAt = new Date();
  } else {
    // Create new user
    user = new UserModel({
      email: normalizedEmail,
      username,
      password,
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  try {
    await user.save();

    try {
      await sendVerificationCode(normalizedEmail, verificationCode);
    } catch (err) {
      user.verificationCode = undefined as any;
      user.verificationCodeExpires = undefined as any;
      await user.save();
      return res.status(500).json({ success: false, msg: "Failed to send verification email. Please try again." });
    }

    return res.status(201).json({
      success: true,
      msg: "Registered. Check your email for the verification code.",
      user: sanitizeUser(user as IUser),
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, msg: "Email or username already in use" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

//resend verification
const resendVerification = async (req: Request<{}, {}, { email: string }>, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, msg: "Email required" });

  const normalizedEmail = email.toLowerCase().trim();
  const user = await UserModel.findOne({ email: normalizedEmail });

  if (!user) return res.status(404).json({ success: false, msg: "User not found" });
  if (user.isVerified) return res.status(400).json({ success: false, msg: "Already verified" });

  // Update fields
  const code = generateOtp(6);
  user.verificationCode = code;
  user.verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
  user.updatedAt = new Date();

  try {
    await user.save();

    await sendVerificationCode(normalizedEmail, code);
  } catch (err) {
    return res.status(500).json({ success: false, msg: "Failed to send verification email" });
  }

  return res.status(200).json({ success: true, msg: "Verification code resent" });
};

// VERIFY EMAIL
const verifyEmail = async (req: Request<{}, {}, { code: string; email?: string }>, res: Response) => {
  const { code, email } = req.body;

  const query: any = email ? { email: email.toLowerCase().trim(), verificationCode: code } : { verificationCode: code };
  const user = await UserModel.findOne(query);

  if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired code" });
  if (!user.verificationCodeExpires || new Date() > user.verificationCodeExpires) {
    return res.status(400).json({ success: false, msg: "Invalid or expired code" });
  }

  user.isVerified = true;
  user.verificationCode = undefined as any;
  user.verificationCodeExpires = undefined as any;
  await user.save();

  welcomeEmail(user.email, user.username).catch(err => console.error("Failed to send welcome email:", err));
  return res.status(200).json({ success: true, msg: "Email verified successfully" });
};

// LOGIN
const login = async (req: Request<{}, {}, { identifier: string; password: string }>, res: Response) => {
  const { identifier, password } = req.body;

  const user = await UserModel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  const isMatch = await user.comparePassword(password);
  console.log(isMatch, user.email,  password, user.password);
  if (!isMatch) return res.status(400).json({ success: false, msg: "Invalid credentials" });

  if (!user.isVerified) {
    return res.status(403).json({ success: false, msg: "Email not verified" });
  }

  const { accessToken, refreshToken } = user.generateTokens();
  user.refreshToken = refreshToken;
  await user.save();

  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json({ success: true, msg: "new login successful", user: sanitizeUser(user) });
};

// FORGOT PASSWORD
const forgotPassword = async (req: Request<{}, {}, { email: string }>, res: Response) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  user.resetOtp = otp;
  user.resetOtpExpires = expiresAt;
  await user.save();

  sendResetOtpEmail(email, otp).catch(err => console.error("Failed to send OTP email:", err));

  return res.status(200).json({
    success: true,
    msg: "OTP sent to email",
    otpExpiresAt: expiresAt.toISOString(),
  });
};

// RESET PASSWORD
const JWT_EXPIRY_SECONDS = 5 * 60; // 5 minutes

// VERIFY RESET OTP 
const verifyResetOtp = async (req: Request<{}, {}, { email: string; otp: string }>, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, msg: "Email and OTP required" });

  const normalizedEmail = String(email).toLowerCase().trim();

  try {
    const user = await UserModel.findOne({
      email: normalizedEmail,
      resetOtp: otp,
      resetOtpExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired OTP" });

    const secret = process.env.RESET_PASSWORD_TOKEN_SECRET;
    if (!secret) {
      console.error("Missing RESET_PASSWORD_TOKEN_SECRET in env");
      return res.status(500).json({ success: false, msg: "Server misconfiguration" });
    }

    const payload = { user : user?._id as string, ts: Date.now()};
    const resetToken = jwt.sign(payload, secret, { expiresIn: `${JWT_EXPIRY_SECONDS}s` });

    const secureFlag = process.env.NODE_ENV === "production";
    res.cookie("resetToken", resetToken, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      maxAge: JWT_EXPIRY_SECONDS * 1000,
    });

    return res.status(200).json({
      success: true,
      msg: "OTP verified",
      expiresIn: JWT_EXPIRY_SECONDS, // 5min
    });
  } catch (err) {
    console.error("verifyResetOtp error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

// UPDATE PASSWORD
const updatePassword = async (req: Request<{}, {}, { newPassword: string }>, res: Response) => {
  const { newPassword } = req.body;
  const resetToken = (req.cookies && req.cookies.resetToken) || (req.headers["x-reset-token"] as string);
  if (!resetToken || !newPassword) return res.status(400).json({ success: false, msg: "resetToken and newPassword required" });

  const secret = process.env.RESET_PASSWORD_TOKEN_SECRET;
  if (!secret) {
    console.error("Missing RESET_PASSWORD_TOKEN_SECRET in env");
    return res.status(500).json({ success: false, msg: "Server misconfiguration" });
  }

  try {
    const decoded = jwt.verify(resetToken, secret) as { user: string; ts?: number };
    const userId = decoded.user;
    if (!userId) return res.status(400).json({ success: false, msg: "Invalid token" });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    if (!user.resetOtpExpires || new Date() > user.resetOtpExpires) {
      return res.status(400).json({ success: false, msg: "Reset OTP expired — please request a new one" });
    }

    user.password = newPassword;

    user.resetOtp = undefined as any;
    user.resetOtpExpires = undefined as any;
    user.refreshToken = undefined as any; 

    await user.save();

    const secureFlag = process.env.NODE_ENV === "production";
    res.clearCookie("resetToken", { httpOnly: true, secure: secureFlag, sameSite: "none" });

    return res.status(200).json({ success: true, msg: "Password updated successfully" });
  } catch (err: any) {
    if (err && err.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, msg: "Reset token expired" });
    }
    if (err && err.name === "JsonWebTokenError") {
      return res.status(400).json({ success: false, msg: "Invalid reset token" });
    }
    console.error("updatePassword error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      (req.headers["x-refresh-token"] as string);

    if (!refreshToken) {
      return res.status(400).json({ success: false, msg: "No refresh token provided" });
    }
    const user = await UserModel.findOne({ refreshToken });

    if (!user) {
      res.cookie("accessToken","invalid" ,options);
      res.cookie("refreshToken","invalid" ,options);
      return res.status(200).json({ success: true, msg: "Logged out successfully" });
    }

    user.refreshToken = undefined as any;
    user.refreshTokenExpires = new Date(Date.now()); // expire immediately
    await user.save();

    res.cookie("accessToken","invalid", options);
    res.cookie("refreshToken", "invalid",options );

    return res.status(200).json({ success: true, msg: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

export { register, verifyEmail, resendVerification, login, forgotPassword, verifyResetOtp, updatePassword, logout };
