import express from "express";
import { forgotPassword, resendVerification, login, register, verifyEmail, verifyResetOtp, updatePassword, logout} from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate";
import { ipLimiter, emailLimiter} from "../middlewares/rateLimit";
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  forgetPasswordSchema,
  logoutSchema
} from "../schemas/auth";

const AuthRoutes = express.Router();

AuthRoutes.post("/register", validate(registerSchema), emailLimiter,asyncHandler(register));
AuthRoutes.post("/verifyemail", validate(verifyEmailSchema), asyncHandler(verifyEmail));
AuthRoutes.post("/resend", asyncHandler(resendVerification));
AuthRoutes.post("/login", validate(loginSchema),emailLimiter, asyncHandler(login));
AuthRoutes.post("/forgetpassword", validate(forgetPasswordSchema),emailLimiter, asyncHandler(forgotPassword));
AuthRoutes.post("/verifyresetotp",  asyncHandler(verifyResetOtp));
AuthRoutes.post("/updatepassword",  asyncHandler(updatePassword));
AuthRoutes.post("/logout", validate(logoutSchema), asyncHandler(logout));


export default AuthRoutes;
