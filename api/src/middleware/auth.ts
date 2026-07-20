import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { ApiError } from "./errors";

export interface AuthContext {
  userId: string;
  role: "USER" | "ADMIN";
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing access token");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      throw new Error("malformed payload");
    }
    req.auth = { userId: payload.sub, role: payload.role };
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new ApiError(401, "Missing access token");
  if (req.auth.role !== "ADMIN") throw new ApiError(403, "Admin access required");
  next();
};
