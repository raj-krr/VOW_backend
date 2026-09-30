import { Request, Response, NextFunction, CookieOptions } from "express";
import { ApiError } from "../utils/ApiError";
import jwt, { JwtPayload } from "jsonwebtoken";

const WORKSPACE_JWT_SECRET = process.env.WORKSPACE_JWT_SECRET || process.env.JWT_SECRET || "vow_workspace_secret_fallback_key_2026";

export const generateWorkspaceToken = (workspaceId: string, userId: string) => {
  return jwt.sign(
    { workspaceId, userId },
    WORKSPACE_JWT_SECRET,
    { expiresIn: 60 * 30 * 60 * 24 }
  );
};

const isProduction = process.env.NODE_ENV === "production";

export const workspaceCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

interface WorkspaceJwtPayload extends JwtPayload {
  workspaceId: string;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      workspaceUser?: WorkspaceJwtPayload;
    }
  }
}

import Workspace from "../models/workspace";

export const verifyWorkspaceToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.params.workspaceId || req.body?.workspaceId;
    if (!workspaceId) throw new ApiError(400, "Workspace ID required");

    const cookieName = `workspaceToken_${workspaceId}`;
    const headerWsToken =
      (req.headers[`x-workspace-token-${workspaceId}`] as string) ||
      (req.headers["x-workspace-token"] as string);

    const token = req.cookies[cookieName] || (typeof headerWsToken === "string" ? headerWsToken : undefined);

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          WORKSPACE_JWT_SECRET
        ) as WorkspaceJwtPayload;
        req.workspaceUser = decoded;
        return next();
      } catch (tokenErr) {
        // Fall through to user token verification
      }
    }

    // Fallback: Verify via accessToken (crucial for cross-origin production where cookies are blocked)
    const authHeader = req.headers["authorization"] ? req.headers["authorization"].replace("Bearer ", "") : undefined;
    const userToken = req.cookies?.accessToken || authHeader;
    if (userToken) {
      try {
        const userSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET || "ACCESS";
        let verified: any;
        try {
          verified = jwt.verify(userToken, userSecret);
        } catch (e: any) {
          if (e.name === "TokenExpiredError") {
            verified = jwt.verify(userToken, userSecret, { ignoreExpiration: true });
          } else {
            throw e;
          }
        }
        const userId = verified?._id || verified?.id;
        if (userId) {
          const ws = await Workspace.findById(workspaceId);
          if (ws) {
            const isMember = ws.members.some((m: any) => m.toString() === userId.toString());
            const isManager = ws.manager && ws.manager.toString() === userId.toString();
            if (isMember || isManager) {
              req.workspaceUser = { workspaceId, userId: userId.toString() };
              return next();
            }
          }
        }
      } catch (authErr) {
        // Ignore and throw ApiError below
      }
    }

    throw new ApiError(401, "Workspace token missing or unauthorized");
  } catch (err) {
    next(new ApiError(401, "Invalid or expired workspace token"));
  }
};