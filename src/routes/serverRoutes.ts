import express from "express";
import { createServer, getUserServers } from "../controllers/serverController";
import { verifyJWT } from "../middlewares/authmiddleware";

const router = express.Router();

router.post("/", verifyJWT, createServer);
router.get("/user/:userId", verifyJWT, getUserServers);

export default router;
