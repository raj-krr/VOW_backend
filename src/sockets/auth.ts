import jwt from "jsonwebtoken";
import UserModel from "../models/user";
import { Socket } from "socket.io";
import cookie from "cookie";

export interface DecodedToken {
  _id: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export const verifySocketToken = async (token?: string) => {
  if (!token) throw new Error("No token provided");
  const decoded = jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET as string
  ) as DecodedToken;
  if (!decoded?._id) throw new Error("Invalid token");
  const user = await UserModel.findById(decoded._id).select(
    "-password -refreshToken"
  );
  if (!user) throw new Error("User not found");
  return user;
};

export const getTokenFromSocket = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = cookie.parse(cookieHeader);
  let token =
    cookies.accessToken ||
    cookies.Authorization ||
    cookies.token ||
    cookies.jwt ||
    undefined;

  if (!token) return undefined;
  if (token.startsWith("Bearer ")) token = token.slice(7);

  return token;
};