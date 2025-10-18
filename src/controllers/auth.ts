import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { sendVerificationCode, welcomeEmail, sendResetOtpEmail } from "../middlewares/email";
import { generateOtp } from "../utils/otp";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const sanitizeUser = (userDoc: IUser) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.refreshToken;
  delete user.resetOtp;
  delete user.resetOtpExpires;
  delete user.verificationCode;
  return user;
};

// REGISTER
const register = async (req: Request<{}, {}, IUser>, res: Response) => {
  const { email,  username, password } = req.body;
  if (!email|| !username || !password) {
    return res.status(400).json({ success: false, msg: "Missing required fields" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const verifiedUser = await UserModel.findOne({ email: normalizedEmail, isVerified: true });
  if (verifiedUser) {
    return res.status(400).json({ success: false, msg: "User already exists" });
  }

  const verifiedUsername = await UserModel.findOne({ username, isVerified: true });
  if (verifiedUsername) {
    return res.status(400).json({ success: false, msg: "Username already taken" });
  }

  const verificationCode = generateOtp(6);
  const verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const query = { email: normalizedEmail, $or: [{ isVerified: false }, { isVerified: { $exists: false } }] };
  const update = {
    $set: {
      username,
      password,
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
      updatedAt: new Date(),
    },
    $setOnInsert: { createdAt: new Date() },
  };


  const bcrypt = require("bcryptjs");
  const salt = await bcrypt.genSalt(10);
  update.$set.password = await bcrypt.hash(password, salt);

  //update unverified user
  try {
    const options = { upsert: true, new: true, runValidators: true };
    const user = await UserModel.findOneAndUpdate(query, update, options).exec();

    try {
      await sendVerificationCode(normalizedEmail, verificationCode);
    } catch (err) {
      if (user) {
        user.verificationCode = undefined as any;
        user.verificationCodeExpires = undefined as any;
        await user.save();
      }
      return res.status(500).json({ success: false, msg: "Failed to send verification email. Please try again." });
    }

    return res.status(201).json({
      success: true,
      msg: "Registered. Check your email for the verification code.",
      user: user ? sanitizeUser(user as IUser) : undefined,
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

  const code = generateOtp(6);
  user.verificationCode = code;
  user.verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  try {
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
  if (!isMatch) return res.status(400).json({ success: false, msg: "Invalid credentials" });

  const { accessToken, refreshToken } = user.generateTokens();
  user.refreshToken = refreshToken;
  await user.save();

  return res.status(200).json({ success: true, msg: "Login successful", user: sanitizeUser(user), accessToken, refreshToken });
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
// verifying OTP and issuing reset token
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

    // Create a short-lived reset token (JWT). Ensure RESET_PASSWORD_TOKEN_SECRET is set in env.
    const secret = process.env.RESET_PASSWORD_TOKEN_SECRET;
    if (!secret) {
      console.error("Missing RESET_PASSWORD_TOKEN_SECRET in env");
      return res.status(500).json({ success: false, msg: "Server misconfiguration" });
    }

    const payload = { uid: String(user._id), ts: Date.now() };
    const resetToken = jwt.sign(payload, secret, { expiresIn: "5m" }); // 5 minutes

    return res.status(200).json({
      success: true,
      msg: "OTP verified",
      resetToken,
      expiresIn: 10 * 60, //60 sec
    });
  } catch (err) {
    console.error("verifyResetOtp error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};

//update password
const updatePassword = async (req: Request<{}, {}, { resetToken: string; newPassword: string }>, res: Response) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ success: false, msg: "resetToken and newPassword required" });

  const secret = process.env.RESET_PASSWORD_TOKEN_SECRET;
  if (!secret) {
    console.error("Missing RESET_PASSWORD_TOKEN_SECRET in env");
    return res.status(500).json({ success: false, msg: "Server misconfiguration" });
  }

  try {
    // verify token
    const decoded = jwt.verify(resetToken, secret) as { uid: string; ts?: number };
    const userId = decoded.uid;
    if (!userId) return res.status(400).json({ success: false, msg: "Invalid token" });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    if (!user.resetOtpExpires || new Date() > user.resetOtpExpires) {
      return res.status(400).json({ success: false, msg: "Reset OTP expired — please request a new one" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    user.password = hashed;

    user.resetOtp = undefined as any;
    user.resetOtpExpires = undefined as any;
    user.refreshToken = undefined as any; 

    await user.save();

    return res.status(200).json({ success: true, msg: "Password updated successfully" });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, msg: "Reset token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ success: false, msg: "Invalid reset token" });
    }
    console.error("updatePassword error:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};





export { register, verifyEmail, resendVerification, login, forgotPassword, verifyResetOtp, updatePassword };
