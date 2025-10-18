import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path, { parse } from "path";
import cors from "cors";
import mongoDb from "./libs/db";
import AuthRoutes from "./routes/authroutes";
import healthRoutes from "./routes/healthroutes";
import cron from "node-cron";
import UserModel from "./models/user";
import { ApiError } from "./utils/ApiError";
import cookieParser from "cookie-parser";


const app: Application = express();
app.use(express.json());
const allowedOrigins = [
  "https://vow-blush.vercel.app",
  "http://localhost:5173",
  "https://vow-git-auth-sarthak12789s-projects.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.options("*", cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const swaggerDocument = YAML.load(path.resolve(__dirname, "swagger", "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/auth", AuthRoutes);
app.use("/", healthRoutes);


interface AppError extends Error {
  statusCode?: number;
  status?: number;
}

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error("Central error handler ->", err);

  const error = err instanceof Error ? err : new Error("Unknown error");
  const statusCode = (err as AppError).statusCode || (err as AppError).status || 500;

  if (res.headersSent) return next(err);

  res.status(statusCode).json({
    success: false,
    msg: error.message,
    ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
  });
});

const PORT: string | number = process.env.PORT || "8000";
mongoDb().then(() => {
  console.log("Database connected successfully");
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
}).catch((err) => {
  console.error("Database connection failed", err);
  process.exit(1);
});
app.listen(PORT);

cron.schedule("0 2 * * *", async () => { // 2am reset for unverified useres
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await UserModel.deleteMany({ isVerified: false, createdAt: { $lt: cutoff } });
  console.log("purged stale unverified accounts");
});

process.on("unhandledRejection", (reason: unknown, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err);
});
