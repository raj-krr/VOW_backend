import { CookieOptions } from "express";

const isProduction = process.env.NODE_ENV === "production";

export const options: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "lax" : "none",
  maxAge: 24 * 60 * 60 * 1000,
};
