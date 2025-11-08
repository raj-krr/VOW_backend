import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./user";
import { IWorkspace } from "./workspace";

export interface IDirectMessage extends Document {
  sender: IUser["_id"];
  receiver: IUser["_id"];
  workspaceId: IWorkspace["_id"];
  content: string;
  attachments?: { url: string; filename?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema = new Schema<IDirectMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    content: { type: String, required: true },
    attachments: [{ url: String, filename: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IDirectMessage>(
  "DirectMessage",
  directMessageSchema
);
