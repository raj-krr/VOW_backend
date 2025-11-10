import { Request, Response, NextFunction } from "express";
import {ZodSchema }from "zod";

export const validate =
  (schema: ZodSchema<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body });
      next();
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        msg: err.errors?.[0]?.message || "Invalid input",
      });
    }
  };
