import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { sendVerificationCode, welcomeEmail, sendResetOtpEmail } from "../middlewares/email";

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
  const { email, name, username, password } = req.body;

  const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(400).json({ success: false, msg: "User already exists" });
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user = new UserModel({ email, username, password, name, verificationCode });
  await user.save();

  sendVerificationCode(email, verificationCode).catch(err =>
    console.error("Failed to send verification email:", err)
  );

  return res.status(201).json({ success: true, msg: "User registered successfully", user: sanitizeUser(user) });
};

// VERIFY EMAIL
const verifyEmail = async (req: Request<{}, {}, { code: string }>, res: Response) => {
  const { code } = req.body;

  const user = await UserModel.findOne({ verificationCode: code });
  if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired code" });

  user.isVerified = true;
  user.verificationCode = undefined;
  await user.save();

  welcomeEmail(user.email, user.name).catch(err => console.error("Failed to send welcome email:", err));

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
const resetPassword = async (req: Request<{}, {}, { email: string; otp: string; newPassword: string }>, res: Response) => {
  const { email, otp, newPassword } = req.body;

  const user = await UserModel.findOne({ email, resetOtp: otp, resetOtpExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired OTP" });

  user.password = newPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  return res.status(200).json({ success: true, msg: "Password reset successful" });
};

// LOGOUT
const logout = async (req: Request<{}, {}, { refreshToken?: string }>, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ success: false, msg: "refreshToken is required" });

  const user = await UserModel.findOne({ refreshToken });
  if (!user) return res.status(200).json({ success: true, msg: "Logged out" });

  user.refreshToken = undefined;
  await user.save();

  return res.status(200).json({ success: true, msg: "Logged out successfully" });
};

export { register, verifyEmail, login, forgotPassword, resetPassword, logout };
