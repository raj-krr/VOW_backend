import mongoose, { Document, Model, Schema } from "mongoose";


export interface IUser extends Document {
  email: string;
  name: string;
  username:string;
  password: string;
  isVerified: boolean;
  verificationCode?: string;
  resetOtp?: string;
  resetOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username:{
      type:String,
      required:true,
      unique:true,
    },
    name: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      required: false,
    },
    resetOtp: { type: String },
  resetOtpExpires: { type: Date },
  },
  { timestamps: true }
);

const UserModel: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default UserModel;
