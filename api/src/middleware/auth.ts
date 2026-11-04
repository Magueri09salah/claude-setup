import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { isSessionReplaced, sessionReplacedError } from "../modules/auth/session";
import { prisma } from "../prisma";
import { ApiError } from "./errors";

export interface AuthContext {
  userId: string;
  role: "USER" | "ADMIN" | "ASSISTANT";
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing access token");
  }
  const token = header.slice("Bearer ".length);
  let tokenKey: unknown;
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      (payload.role !== "USER" &&
        payload.role !== "ADMIN" &&
        payload.role !== "ASSISTANT")
    ) {
      throw new Error("malformed payload");
    }
    req.auth = { userId: payload.sub, role: payload.role };
    tokenKey = payload.sk;
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  // One phone per candidate (see modules/auth/session.ts). Without this a
  // signed-out phone would keep working until its access token ran out.
  if (req.auth.role === "USER") {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: { role: true, sessionKey: true },
    });
    if (user && isSessionReplaced(user, tokenKey)) throw sessionReplacedError();
  }
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new ApiError(401, "Missing access token");
  if (req.auth.role !== "ADMIN") throw new ApiError(403, "Admin access required");
  next();
};

/**
 * Panel staff: the owner (ADMIN) or their helper (ASSISTANT).
 *
 * This only opens the door to the panel. The assistant's actual permissions are
 * decided by WHERE this guard is used: admin.router mounts the two routers an
 * assistant may touch and then applies `requireAdmin` to everything after them,
 * so any route added later is admin-only until someone deliberately moves it.
 */
export const requireStaff: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw new ApiError(401, "Missing access token");
  if (req.auth.role !== "ADMIN" && req.auth.role !== "ASSISTANT") {
    throw new ApiError(403, "Admin access required");
  }
  next();
};
