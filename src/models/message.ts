import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./user";
import { IChannel } from "./channel";

export interface IMessage extends Document {
  channelId: IChannel["_id"];
  sender: IUser["_id"];
  content: string;
  attachments?: { url: string; filename?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    channelId: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    attachments: [{ url: String, filename: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>("Message", messageSchema);
