import UserModel from "../models/user";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import { IUser } from "../models/user";

declare module "express-serve-static-core" {
  interface Request {
    user?: IUser;
  }
}

interface DecodedToken extends JwtPayload {
  _id: string;
}

export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("I have been hitted");

      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(401, "Access token missing");
      }

      let decodedToken: DecodedToken;

      try {
        const verified = jwt.verify(
          token,
          process.env.ACCESS_TOKEN_SECRET as string
        ) as unknown;
        decodedToken = verified as DecodedToken;

        if (!decodedToken._id) {
          throw new ApiError(401, "Token missing user ID");
        }
      } catch (err: any) {
        if (err.name === "TokenExpiredError") {
          throw new ApiError(401, "JWT expired");
        } else {
          throw new ApiError(401, "Invalid token");
        }
      }

      const user = await UserModel.findById(decodedToken._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        throw new ApiError(401, "User not found");
      }

      req.user = user;

      next();
    } catch (error) {
      throw new ApiError(401, "Invalid access token");
    }
  }
);