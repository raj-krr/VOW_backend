import mongoose, { Schema, Document } from "mongoose";

export interface IMap extends Document {
  name: string;
  layoutUrl: string;
  rooms: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  metadata?: Record<string, any>;
}

const MapSchema = new Schema<IMap>({
  name: { type: String, required: true },
  layoutUrl: { type: String, required: true },
  rooms: [{ type: String, ref: "Room" }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
});

export default mongoose.model<IMap>("Map", MapSchema);
