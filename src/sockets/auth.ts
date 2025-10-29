import jwt from "jsonwebtoken";
import UserModel from "../models/user";
import { Socket } from "socket.io";

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
    process.env.JWT_ACCESS_SECRET as string
  ) as DecodedToken;
  if (!decoded?._id) throw new Error("Invalid token");
  const user = await UserModel.findById(decoded._id).select(
    "-password -refreshToken"
  );
  if (!user) throw new Error("User not found");
  return user;
};

export const getTokenFromSocket = (socket: Socket): string | undefined => {
  const authToken = (socket.handshake.auth &&
    (socket.handshake.auth as any).token) as string | undefined;
  if (authToken) return authToken;

  const cookie = socket.handshake.headers.cookie;
  if (!cookie) return undefined;
  const pairs = cookie.split(";").map((c) => c.trim());
  for (const p of pairs) {
    if (p.startsWith("Authorization=")) {
      const val = p.split("=")[1];
      if (val?.startsWith("Bearer ")) return val.replace("Bearer ", "");
      return val;
    }
    if (p.startsWith("token=")) return p.split("=")[1];
  }
  return undefined;
};
