// src/server.ts
import express, { Application } from "express";
import dotenv from "dotenv";
import mongoDb from "./libs/db"; // no need for .js in TS
import AuthRoutes from "./routes/authroutes"; // update filename if needed

dotenv.config();
mongoDb(); // initialize MongoDB

const app: Application = express();

app.use(express.json());
app.use("/auth", AuthRoutes);

const PORT: number = parseInt(process.env.PORT || "8000", 10);

app.listen(PORT, () => {
  console.log(`The server is running at: ${PORT}`);
});
