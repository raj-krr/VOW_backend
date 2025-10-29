import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./user";
import { IServer } from "./server";

export type ChannelType = "text" | "voice";

export interface IChannel extends Document {
  name: string;
  type: ChannelType;
  server: IServer["_id"];
  members: IUser["_id"][];
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannel>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["text", "voice"], default: "text" },
    server: { type: Schema.Types.ObjectId, ref: "Server", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model<IChannel>("Channel", channelSchema);
