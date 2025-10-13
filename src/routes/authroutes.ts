import express from "express";
import { forgotPassword, login, register, resetPassword, verifyEmail, logout } from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";

const AuthRoutes = express.Router();

AuthRoutes.post("/register", asyncHandler(register));
AuthRoutes.post("/verifyemail", asyncHandler(verifyEmail));
AuthRoutes.post("/login", asyncHandler(login));
AuthRoutes.post("/forgetpassword", asyncHandler(forgotPassword));
AuthRoutes.post("/resetpassword", asyncHandler(resetPassword));
AuthRoutes.post("/logout", asyncHandler(logout));

export default AuthRoutes;
