import dotenv from "dotenv";
dotenv.config();


import express, { Application } from "express";
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

const PORT: string | number = process.env.PORT || "8000";

app.listen(PORT, () => {
  console.log(`The server is running at: ${PORT}`);
  console.log(` Swagger Docs: http://localhost:${PORT}/api-docs`);
});
