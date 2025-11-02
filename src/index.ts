import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import express, { Application, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import deepmerge from "deepmerge";
import path from "path";
import cors from "cors";
import mongoDb from "./libs/db";
import AuthRoutes from "./routes/authroutes";
import healthRoutes from "./routes/healthroutes";
import cron from "node-cron";
import UserModel from "./models/user";
import cookieParser from "cookie-parser";
import meRouter from "./routes/meRoutes";
import fileRouter from "./routes/fileRoutes";

import http from "http";
import { initSocket } from "./sockets";
import workspaceRouter from "./routes/workspaceRoute";
import managerRouter from "./routes/managerRoutes";
import superviserRouter from "./routes/superviserRoute";

// import serverRoutes from "./routes/serverRoutes";
import channelRoutes from "./routes/channelRoutes";
import messageRoutes from "./routes/messageRoutes";
import mapRoutes from "./routes/mapRoutes";
import roomRoutes from "./routes/roomRoutes";
import meetingRoutes from "./routes/meetingRoutes"

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.json());

app.use(cors({
  origin: [process.env.FRONTEND_URL as string, "http://localhost:5173"],

  credentials: true,
}));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Helper to safely load a YAML file
function safeLoadYAML(fileName: string) {
  const filePath = path.resolve(__dirname, "swagger", fileName);
  if (fs.existsSync(filePath)) {
    return YAML.load(filePath);
  } else {
    console.warn(` Swagger file missing: ${fileName}`);
    return {};
  }
}

const authDoc = safeLoadYAML("auth.yaml");
const meDoc = safeLoadYAML("me.yaml");
const fileDoc = safeLoadYAML("file.yaml");
const baseDoc = safeLoadYAML("swagger.yaml");
const workspaceDoc = safeLoadYAML("workspace.yaml");
const meetingDoc = safeLoadYAML("meeting.yaml");
const mapDoc = safeLoadYAML("map.yaml");
const msgDoc = safeLoadYAML("msg.yaml");



const mergedDoc = deepmerge.all([ authDoc, meDoc, fileDoc, workspaceDoc, meetingDoc, mapDoc, msgDoc]);

if (Object.keys(mergedDoc).length > 0) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(mergedDoc as Record<string, any>));
  console.log(` Swagger Docs loaded at /api-docs`);
} else {
  console.warn(" No Swagger docs found, skipping /api-docs route");
}

// API routes
app.use("/auth", AuthRoutes);
app.use("/", healthRoutes);
app.use("/me", meRouter);
app.use("/files",fileRouter);

// app.use("/api/servers", serverRoutes);
app.use("/channels", channelRoutes);
app.use("/messages", messageRoutes);
app.use("/workspaces",workspaceRouter);
app.use("/manager",managerRouter);
app.use("/superviser" ,superviserRouter);

app.use("/maps", mapRoutes);
app.use("/", roomRoutes);
app.use("/meeting",meetingRoutes);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("Central error handler ->", err);

  const error = err instanceof Error ? err : new Error("Unknown error");
  const statusCode = (err as any).statusCode || 500;

  if (res.headersSent) return next(err);

  res.status(statusCode).json({
    success: false,
    msg: error.message,
    ...(process.env.NODE_ENV !== "production" ? { stack: (error as any).stack } : {}),
  });
});

// Start server after DB connects
const PORT = process.env.PORT || 8000;
mongoDb()
  .then(() => {
    const server = http.createServer(app);
    const io = initSocket(server);

    server.listen(PORT, () => {
      console.log(` Database connected successfully`);
      console.log(` Server running  at http://localhost:${PORT}`);
      console.log(` Swagger Docs: http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed", err);
    process.exit(1);
  });

// Cron job: clean up unverified users daily at 2am
cron.schedule("0 2 * * *", async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await UserModel.deleteMany({ isVerified: false, createdAt: { $lt: cutoff } });
  console.log("🧹 Purged stale unverified accounts");
});

// Error safety
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});