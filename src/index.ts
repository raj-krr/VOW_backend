import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import cors from "cors";
import mongoDb from "./libs/db";
import AuthRoutes from "./routes/authroutes";
import healthRoutes from "./routes/healthroutes";
import cron from "node-cron";
import UserModel from "./models/user";
import { ApiError } from "./utils/ApiError";
import cookieParser from "cookie-parser";
import meRouter from "./routes/meRoutes";
import fileRouter from "./routes/fileRoutes";
import workspaceRouter from "./routes/workspaceRoute";
import managerRouter from "./routes/managerRoutes";
import superviserRouter from "./routes/superviserRoute";


const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use(express.json());

app.use(cors({
  origin: [process.env.FRONTEND_URL as string, "http://localhost:5173"] ,

  credentials: true,
}));



app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


const swaggerDocument = YAML.load(path.resolve(__dirname, "swagger", "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use("/auth", AuthRoutes);
app.use("/", healthRoutes);
app.use("/me",meRouter);
app.use("/files",fileRouter);
app.use("/workspaces",workspaceRouter);
app.use("/manager",managerRouter);
app.use("/superviser" ,superviserRouter);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("Central error handler ->", err);

  const error = err instanceof Error ? err : new Error("Unknown error");
  const statusCode = (err as any).statusCode || 500;

  if (res.headersSent) return next(err);

  res.status(statusCode).json({
    success: false,
    msg: error.message,
    ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
  });
});

// Start server after DB connects
const PORT = process.env.PORT || 8000;
mongoDb()
  .then(() => {
    app.listen(PORT, () => {
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
