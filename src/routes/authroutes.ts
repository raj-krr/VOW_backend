import express, { Router } from "express";
import { forgotPassword, login, register, resetPassword, verifyEmail } from "../controllers/auth";

const AuthRoutes: Router = express.Router();

AuthRoutes.post("/register", register);
AuthRoutes.post("/verifyemail", verifyEmail);

AuthRoutes.post("/login", login);
AuthRoutes.post("/forgetpassword",forgotPassword);
AuthRoutes.post("/resetpassword",resetPassword);

export default AuthRoutes;
