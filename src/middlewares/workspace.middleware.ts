import { Request,Response,NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import jwt, { JwtPayload } from "jsonwebtoken";

 export const generateWorkspaceToken = (workspaceId: string, userId: string) => {
  return jwt.sign(
    { workspaceId, userId },
    process.env.WORKSPACE_JWT_SECRET as string,
    { expiresIn: 60*30*60*24 }
  );
};

interface WorkspaceJwtPayload extends JwtPayload{
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
    const { workspaceId } = req.params; 
    if (!workspaceId) throw new ApiError(400, "Workspace ID required");

    const cookieName = `workspaceToken_${workspaceId}`;
    const token = req.cookies[cookieName];
    if (!token) throw new ApiError(401, "Workspace token missing");

    const decoded = jwt.verify(
      token,
      process.env.WORKSPACE_JWT_SECRET!
    ) as WorkspaceJwtPayload;

    req.workspaceUser = decoded;
    next();
  } catch (err) {
    next(new ApiError(401, "Invalid or expired workspace token"));
  }
};