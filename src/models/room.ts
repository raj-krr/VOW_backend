import mongoose, { Schema, Document, Model } from "mongoose";


export interface IRoom extends Document {
name: string;
slug: string;
description?: string;
isPrivate: boolean;
metadata?: Record<string, any>;
createdBy: mongoose.Types.ObjectId | string;
createdAt: Date;
expiresAt?: Date | null;
}


const RoomSchema = new Schema<IRoom>({
name: { type: String, required: true },
slug: { type: String, required: true, index: { unique: true } },
description: { type: String },
isPrivate: { type: Boolean, default: false },
metadata: { type: Schema.Types.Mixed },
createdBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
expiresAt: { type: Date, default: null },
createdAt: { type: Date, default: () => new Date() },
});

const Room: Model<IRoom> = mongoose.model<IRoom>("Room", RoomSchema);

export default Room;