import express from "express";
import { forgotPassword, resendVerification, login, register, resetPassword, verifyEmail} from "../controllers/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate";
import { ipLimiter, emailThrottle } from "../middlewares/rateLimit";
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
  logoutSchema
} from "../schemas/auth";

const AuthRoutes = express.Router();

AuthRoutes.post("/register", validate(registerSchema), asyncHandler(register));
AuthRoutes.post("/verifyemail", validate(verifyEmailSchema), asyncHandler(verifyEmail));
AuthRoutes.post("/resend", asyncHandler(resendVerification));
AuthRoutes.post("/login", validate(loginSchema), asyncHandler(login));
AuthRoutes.post("/forgetpassword", validate(forgetPasswordSchema), asyncHandler(forgotPassword));
AuthRoutes.post("/resetpassword", validate(resetPasswordSchema), asyncHandler(resetPassword));

export default AuthRoutes;
