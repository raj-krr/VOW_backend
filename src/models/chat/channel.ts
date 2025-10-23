import mongoose, { Document, Schema } from "mongoose";

export interface IChannel extends Document {
  name: string;
  slug: string;
  type: "public" | "private" | "dm";
  members: mongoose.Types.ObjectId[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  meta?: any;
}

const ChannelSchema = new Schema<IChannel>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: { type: String, enum: ["public", "private", "dm"], default: "public" },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  meta: { type: Schema.Types.Mixed },
});

ChannelSchema.index({ slug: 1 });
ChannelSchema.index({ type: 1 });

const Channel = mongoose.model<IChannel>("Channel", ChannelSchema);
export default Channel;
