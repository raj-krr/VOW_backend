import express, { Router } from "express";
import { register, verifyEmail } from "../controllers/auth";

const AuthRoutes: Router = express.Router();

AuthRoutes.post("/register", register);
AuthRoutes.post("/verifyemail", verifyEmail);

export default AuthRoutes;
