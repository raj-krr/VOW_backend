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

export const verifyWorkspaceToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspaceId = req.params.workspaceId || req.body?.workspaceId;
    if (!workspaceId) throw new ApiError(400, "Workspace ID required");

    const cookieName = `workspaceToken_${workspaceId}`;
    const headerToken =
      (req.headers[`x-workspace-token-${workspaceId}`] as string) ||
      (req.headers["x-workspace-token"] as string) ||
      (req.headers["authorization"] ? req.headers["authorization"].replace("Bearer ", "") : undefined);

    const token = req.cookies[cookieName] || (typeof headerToken === "string" ? headerToken : undefined);
    if (!token) throw new ApiError(401, "Workspace token missing");

    const decoded = jwt.verify(
      token,
      WORKSPACE_JWT_SECRET
    ) as WorkspaceJwtPayload;

    req.workspaceUser = decoded;
    next();
  } catch (err) {
    next(new ApiError(401, "Invalid or expired workspace token"));
  }
};