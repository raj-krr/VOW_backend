import mongoose, { Document, Schema } from "mongoose";

export interface IMeeting extends Document {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  workspace: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true },
    description: String,
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    attendees: [{ type: String, required: true }],
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
},
  { timestamps: true }
);

export default mongoose.model<IMeeting>("Meeting", meetingSchema);
