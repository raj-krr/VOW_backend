import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./user";

export interface IServer extends Document {
  name: string;
  owner: IUser["_id"];
  members: IUser["_id"][];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const serverSchema = new Schema<IServer>(
  {
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IServer>("Server", serverSchema);
