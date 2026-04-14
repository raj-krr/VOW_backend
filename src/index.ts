import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import mongoDb from "./libs/db";
import { initSocket } from "./sockets";
import { dmSocketHandler } from "./sockets/dmSocket";
import { initVideoChat } from "./videochat/init";
import cron from "node-cron";
import UserModel from "./models/user";

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    await mongoDb();

    const server = http.createServer(app);

    const io = initSocket(server);

    // await initVideoChat(app, server);

    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    // cron
    cron.schedule("0 2 * * *", async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await UserModel.deleteMany({
        isVerified: false,
        createdAt: { $lt: cutoff },
      });
    });

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

startServer();