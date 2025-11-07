import mongoose, { Document, Schema } from "mongoose";

export interface IFile extends Document {
  filename: string;
  url: string;
  s3FileId: string;
  size: number;
  mimeType: string;
  workspace: mongoose.Schema.Types.ObjectId;
  uploadedBy: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    s3FileId: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IFile>("File", fileSchema);
