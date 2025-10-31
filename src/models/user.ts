import mongoose, { Document, Model, Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  resetOtp?: string;
  resetOtpExpires?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
   refreshTokenExpires?: Date,

  fullName?: string;
  organisation?: string;
  gender?: "male" | "female" | "other";
  dob?: Date;
  avatar?: string;

  comparePassword(password: string): Promise<boolean>;
  isPasswordCorrect(password: string): Promise<boolean>;
  generateTokens(): { accessToken: string; refreshToken: string };
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
    refreshToken: { type: String },
refreshTokenExpires: { type: Date },
    fullName: { type: String },
  organisation: { type: String },
  gender: { type: String, enum: ["male", "female", "other"] },
  dob: { type: Date },
  avatar: { type: String },
  },
  { timestamps: true }
);


userSchema.pre("save", async function (next) {
  const user = this as IUser;
  if (!user.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  next();
});
userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};
userSchema.methods.generateTokens = function () {
  const user = this as IUser;
  const accessToken = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "8h" }
  );
  const refreshToken = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

const UserModel: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default UserModel;
