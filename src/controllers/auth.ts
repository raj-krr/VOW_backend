import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import UserModel from "../models/user";
import { sendVerificationCode, welcomeEmail ,sendResetOtpEmail} from "../middlewares/email";

interface RegisterRequestBody {
  email: string;
  name: string;
  password: string;
  username:string;
};

interface VerifyEmailRequestBody {
  code: string;
}
interface LoginRequestBody{
  identifier:string,
  password:string,
};
interface ForgetpasswordRequestBody{
  email:string,
}
interface ResetPasswordRequestBody{
  email:string,
  otp:string,
  newPassword:string
}
//signup
const register = async (req: Request< {},{}, RegisterRequestBody>, res: Response): Promise<Response> => {
  try {
    const { email, name, password ,username} = req.body;

    if (!email || !name || !password || !username) {
      return res.status(400).json({ success: false, msg: "All fields are required" });
    }

  const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new UserModel({
      email,
      username,
      password: hashedPassword,
      name,
      verificationCode,
    });

    await user.save();
    await sendVerificationCode(user.email, verificationCode);

    return res.status(200).json({ success: true, msg: "User registered successfully", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
// verify email
const verifyEmail = async (req: Request<{}, {}, VerifyEmailRequestBody>, res: Response): Promise<Response> => {
  try {
    const { code } = req.body;

    const user = await UserModel.findOne({ verificationCode: code });
    if (!user) {
      return res.status(400).json({ success: false, msg: "Invalid or expired code" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();

    await welcomeEmail(user.email, user.name);

    return res.status(200).json({ success: true, msg: "Email verified successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
//login
const login = async (req: Request<{},{},LoginRequestBody>, res: Response): Promise<Response> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, msg: "All fields are required" });
    }

    const user = await UserModel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) {
      return res.status(400).json({ success: false, msg: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, msg: "Invalid credentials" });
    }

    return res.status(200).json({ success: true, msg: "Login successful", user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }

};

// Generate and send OTP
 const forgotPassword = async (req: Request<{}, {}, ForgetpasswordRequestBody>, res: Response): Promise<Response> => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, msg: "Email is required" });

    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); 
    await user.save();

    await sendResetOtpEmail(email, otp);
    return res.status(200).json({ success: true, msg: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
// Verify OTP and reset password
const resetPassword = async (req: Request<{}, {}, ResetPasswordRequestBody>, res: Response): Promise<Response> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ success: false, msg: "All fields are required" });

    const user = await UserModel.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: { $gt: new Date() }, 
    });

    if (!user)
      return res.status(400).json({ success: false, msg: "Invalid or expired OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, msg: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

export { register, verifyEmail, login ,forgotPassword,resetPassword};
