import express, { Router } from "express";
import { forgotPassword, login, register, resetPassword, verifyEmail, logout } from "../controllers/auth";

const AuthRoutes: Router = express.Router();

AuthRoutes.post("/register", register);
AuthRoutes.post("/verifyemail", verifyEmail);

AuthRoutes.post("/login", login);
AuthRoutes.post("/forgetpassword",forgotPassword);
AuthRoutes.post("/resetpassword",resetPassword);
AuthRoutes.post("/logout",logout);

export default AuthRoutes;
