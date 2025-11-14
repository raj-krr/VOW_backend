import mongoose, { Schema, Document } from "mongoose";

export interface IMapObject {
  id: string;
  type: string;
  position: { x: number; y: number };
  imageSize?: number;
  collision?: { width: number; height: number };
  metadata?: Record<string, any>;
}

export interface IMap extends Document {
  name: string;
  dimensions: { width: number; height: number };
  objects: IMapObject[];
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
}

const MapSchema = new Schema<IMap>({
  name: { type: String, required: true },

  dimensions: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },

  objects: [
    {
      id: { type: String, required: true },
      type: { type: String, required: true },
      position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
      },
      imageSize: Number,
      collision: {
        width: Number,
        height: Number,
      },
      metadata: Schema.Types.Mixed,
    },
  ],

  createdBy: { type: Schema.Types.ObjectId, ref: "User" },

  metadata: { type: Schema.Types.Mixed },
});

export default mongoose.model<IMap>("Map", MapSchema);
