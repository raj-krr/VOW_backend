import mongoose from "mongoose";

const mongoDb = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

export default mongoDb;
