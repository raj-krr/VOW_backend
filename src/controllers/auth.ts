import { Request, Response } from "express";
import UserModel, { IUser } from "../models/user";
import { sendVerificationCode, welcomeEmail, sendResetOtpEmail } from "../middlewares/email";

interface RegisterRequestBody {
  email: string;
  name: string;
  password: string;
  username: string;
}

interface VerifyEmailRequestBody {
  code: string;
}

interface LoginRequestBody {
  identifier: string;
  password: string;
}

interface ForgetPasswordRequestBody {
  email: string;
}

interface ResetPasswordRequestBody {
  email: string;
  otp: string;
  newPassword: string;
}

interface LogoutRequestBody {
  refreshToken?: string;
}

//clearing log for safety
const sanitizeUser = (userDoc: IUser) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete user.password;
  delete user.refreshToken;
  delete user.resetOtp;
  delete user.resetOtpExpires;
  delete user.verificationCode;
  return user;
};

//register
const register = async (req: Request<{}, {}, RegisterRequestBody>, res: Response) => {
  const { email, name, password, username } = req.body;

  if (!email || !name || !password || !username) {
    return res.status(400).json({ success: false, msg: "All fields are required" });
  }

  const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    return res.status(400).json({ success: false, msg: "User already exists" });
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const user = new UserModel({
    email,
    username,
    password,
    name,
    verificationCode,
  });

  await user.save();

  sendVerificationCode(user.email, verificationCode).catch(err =>
    console.error("Failed to send verification email:", err)
  );

  const safeUser = sanitizeUser(user);
  return res.status(201).json({ success: true, msg: "User registered successfully", user: safeUser });
};

//email verification
const verifyEmail = async (req: Request<{}, {}, VerifyEmailRequestBody>, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, msg: "Verification code is required" });

  const user = await UserModel.findOne({ verificationCode: code });
  if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired code" });

  user.isVerified = true;
  user.verificationCode = undefined;
  await user.save();

  welcomeEmail(user.email, user.name).catch(err => console.error("Failed to send welcome email:", err));

  return res.status(200).json({ success: true, msg: "Email verified successfully" });
};

//login
const login = async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, msg: "All fields are required" });

  const user = await UserModel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(400).json({ success: false, msg: "Invalid credentials" });

  const { accessToken, refreshToken } = user.generateTokens();
  user.refreshToken = refreshToken;
  await user.save();

  const safeUser = sanitizeUser(user);
  return res.status(200).json({ success: true, msg: "Login successful", user: safeUser, accessToken, refreshToken });
};

//forgot password
const forgotPassword = async (req: Request<{}, {}, ForgetPasswordRequestBody>, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, msg: "Email is required" });

  const user = await UserModel.findOne({ email });
  if (!user) return res.status(404).json({ success: false, msg: "User not found" });

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  user.resetOtp = otp;
  user.resetOtpExpires = expiresAt;
  await user.save();

  // Send OTP email safely
  sendResetOtpEmail(email, otp).catch(err => console.error("Failed to send OTP email:", err));

  const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  return res.status(200).json({
    success: true,
    msg: "OTP sent to email",
    otpExpiresAt: expiresAt.toISOString(),
    // otpExpiresIn,
  });
};


//reset password
const resetPassword = async (req: Request<{}, {}, ResetPasswordRequestBody>, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ success: false, msg: "All fields are required" });

  const user = await UserModel.findOne({ email, resetOtp: otp, resetOtpExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ success: false, msg: "Invalid or expired OTP" });

  user.password = newPassword;
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  return res.status(200).json({ success: true, msg: "Password reset successful" });
};

//logout
const logout = async (req: Request<{}, {}, LogoutRequestBody>, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, msg: "refreshToken is required" });

  const user = await UserModel.findOne({ refreshToken });
  if (!user) return res.status(200).json({ success: true, msg: "Logged out" });

  user.refreshToken = undefined;
  await user.save();

  return res.status(200).json({ success: true, msg: "Logged out successfully" });
};

export { register, verifyEmail, login, forgotPassword, resetPassword, logout };
