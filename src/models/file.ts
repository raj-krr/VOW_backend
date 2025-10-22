import mongoose, { Document, Schema } from "mongoose";
import UserModel from "./user";

export interface IFile extends Document {
  filename: string;
  url: string;
  cloudinaryId: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IFile>("File", fileSchema);
