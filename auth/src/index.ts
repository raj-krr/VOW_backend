
import express, { Application } from "express";
import dotenv from "dotenv";
import mongoDb from "./libs/db"; 
import AuthRoutes from "./routes/authroutes"; 

dotenv.config();
mongoDb(); 

const app: Application = express();

app.use(express.json());
app.use("/auth", AuthRoutes);

const PORT: number = parseInt(process.env.PORT || "8000", 10);

app.listen(PORT, () => {
  console.log(`The server is running at: ${PORT}`);
});
