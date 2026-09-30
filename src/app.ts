import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import deepmerge from "deepmerge";
import fs from "fs";

// routes
import AuthRoutes from "./routes/authroutes";
import healthRoutes from "./routes/healthroutes";
import meRouter from "./routes/meRoutes";
import fileRouter from "./routes/fileRoutes";
import workspaceRouter from "./routes/workspaceRoute";
import managerRouter from "./routes/managerRoutes";
import superviserRouter from "./routes/superviserRoute";
import channelRoutes from "./routes/channelRoutes";
import messageRoutes from "./routes/messageRoutes";
import mapRoutes from "./routes/mapRoutes";
import roomRoutes from "./routes/roomRoutes";
import meetingRoutes from "./routes/meetingRoutes";
import dmRouter from "./routes/directMessageRoutes";

const app: Application = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
  "https://www.vow-org.me",
  "https://vow-org.me",
  "https://www.vow-live.me",
  "https://vow-live.me",
  "https://vow-pink.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes("vow-org.me") ||
      origin.includes("vow-live.me") ||
      origin.includes("vercel.app") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1")
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/test", (req, res) => {
  const filePath = path.resolve(__dirname, "views", "socket-test.html");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("File read error:", err);
      return res.status(500).send("File not found");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(data);
  });
});
app.get("/presence-test", (req, res) => {
  res.render("Presence-test");
});

// swagger helper
function safeLoadYAML(fileName: string) {
  const filePath = path.resolve(__dirname, "swagger", fileName);
  return fs.existsSync(filePath) ? YAML.load(filePath) : {};
}

// swagger merge
const mergedDoc = deepmerge.all([
  safeLoadYAML("auth.yaml"),
  safeLoadYAML("me.yaml"),
  safeLoadYAML("file.yaml"),
  safeLoadYAML("workspace.yaml"),
  safeLoadYAML("meeting.yaml"),
  safeLoadYAML("map.yaml"),
  safeLoadYAML("msg.yaml"),
  safeLoadYAML("channel.yaml"),
  safeLoadYAML("room.yaml"),
  safeLoadYAML("dm.yaml"),
  safeLoadYAML("swagger.yaml"),
]);

if (Object.keys(mergedDoc).length > 0) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(mergedDoc));
}

// routes
app.use("/auth", AuthRoutes);
app.use("/", healthRoutes);
app.use("/me", meRouter);
app.use("/files", fileRouter);
app.use("/channels", channelRoutes);
app.use("/messages", messageRoutes);
app.use("/workspaces", workspaceRouter);
app.use("/manager", managerRouter);
app.use("/superviser", superviserRouter);
app.use("/maps", mapRoutes);
app.use("/", roomRoutes);
app.use("/meeting", meetingRoutes);
app.use("/dm", dmRouter);

// error handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const error = err instanceof Error ? err : new Error("Unknown error");
  const statusCode = (err as any).statusCode || 500;

  res.status(statusCode).json({
    success: false,
    msg: error.message,
  });
});

export default app;