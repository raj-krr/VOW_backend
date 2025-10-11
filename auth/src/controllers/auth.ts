import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import UserModel from "../models/user";
import { sendVerificationCode, welcomeEmail } from "../middlewares/email";

interface RegisterRequestBody {
  email: string;
  name: string;
  password: string;
}

interface VerifyEmailRequestBody {
  code: string;
}

const register = async (req: Request<{}, {}, RegisterRequestBody>, res: Response): Promise<Response> => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ success: false, msg: "All fields are required" });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const user = new UserModel({
      email,
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

export { register, verifyEmail };
