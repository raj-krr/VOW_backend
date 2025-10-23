import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspace extends Document {
 workspaceName: string;
 inviterName :string;
  admin: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[] ;
  inviteCode: string;
}

const workspaceSchema = new Schema<IWorkspace>({
  workspaceName: { type: String, required: true },
  admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
  inviterName: { type: String, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  inviteCode: { type: String, required: true, unique: true },
});

export default mongoose.model<IWorkspace>("Workspace", workspaceSchema);
