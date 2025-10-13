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

const app: Application = express();
app.use(express.json());
app.use(cors());

mongoDb();

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
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});

const gracefulShutdown = (err?: Error) => {
  if (err) console.error("Shutting down due to error:", err);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown.");
    process.exit(1);
  }, 10000).unref();
};

process.on("unhandledRejection", (reason: unknown, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown(reason instanceof Error ? reason : new Error(String(reason)));
});

process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown(err);
});
