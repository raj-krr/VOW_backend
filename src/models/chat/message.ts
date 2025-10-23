import mongoose, { Document, Schema } from "mongoose";

export interface IAttachment {
  url: string;
  mime?: string;
  size?: number;
}

export interface IMessage extends Document {
  channelId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  attachments: IAttachment[];
  system: boolean;
  editedAt?: Date | null;
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  url: String,
  mime: String,
  size: Number,
});

const MessageSchema = new Schema<IMessage>({
  channelId: {
    type: Schema.Types.ObjectId,
    ref: "Channel",
    required: true,
    index: true,
  },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "" },
  attachments: [AttachmentSchema],
  system: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

MessageSchema.index({ channelId: 1, createdAt: -1 });

const Message = mongoose.model<IMessage>("Message", MessageSchema);
export default Message;
