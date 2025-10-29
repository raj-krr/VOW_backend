import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITeam extends Document {
  name: string;
  workspaceId: Types.ObjectId;
  members: Types.ObjectId[];
  superviser: Types.ObjectId | null;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    superviser: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model<ITeam>("Team", teamSchema);
