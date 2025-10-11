import mongoose, { Document, Model, Schema } from "mongoose";

// Define TypeScript interface for User document
export interface IUser extends Document {
  email: string;
  name: string;
  password: string;
  isVerified: boolean;
  verificationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema
const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

// Create and export the model
const UserModel: Model<IUser> = mongoose.model<IUser>("User", userSchema);
export default UserModel;
