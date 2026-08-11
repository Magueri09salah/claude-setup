import crypto from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../env";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { applyAllowlistOnRegister } from "../premium/allowlist.service";
import { normalizePhone } from "../premium/phone";

const BCRYPT_COST = 12;
const ACCESS_TTL = "15m";
const REFRESH_DAYS = 30;

// Compared against when the email is unknown, so login timing doesn't reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer-placeholder", BCRYPT_COST);

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    // Effective premium: active flag AND unexpired (premiumUntil null = lifetime).
    isPremium:
      user.isPremium &&
      (user.premiumUntil === null || user.premiumUntil > new Date()),
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(401, "Unknown user");
  return publicUser(user);
}

function signAccessToken(user: Pick<User, "id" | "role">): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TTL,
  });
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = jwt.sign({ jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: `${REFRESH_DAYS}d`,
  });
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  // Stored canonical so the allowlist, and any later lookup, can match it.
  const phone = input.phone ? normalizePhone(input.phone) : null;
  try {
    const created = await prisma.user.create({
      data: {
        email,
        fullName: input.fullName,
        passwordHash,
        phone,
      },
    });

    // Group members (a partner school's list) are premium from the first
    // launch — decided here on the server, never claimed by the client.
    const granted = await applyAllowlistOnRegister(created.id, phone);
    const user = granted
      ? ((await prisma.user.findUnique({ where: { id: created.id } })) ?? created)
      : created;

    return {
      user: publicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: await issueRefreshToken(user.id),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "Email or phone already registered");
    }
    throw e;
  }
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
  });
  const passwordOk = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !passwordOk) {
    throw new ApiError(401, "Invalid email or password");
  }
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user.id),
  };
}

export async function refresh(token: string) {
  let subject: string;
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      throw new Error("malformed payload");
    }
    subject = payload.sub;
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!row || row.userId !== subject) {
    throw new ApiError(401, "Invalid refresh token");
  }
  if (row.revokedAt) {
    // Reuse of a rotated token = possible theft: revoke every active session.
    await prisma.refreshToken.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, "Invalid refresh token");
  }
  if (row.expiresAt <= new Date()) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) throw new ApiError(401, "Invalid refresh token");

  const newToken = await issueRefreshToken(user.id);
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date(), replacedBy: sha256(newToken) },
  });
  return { accessToken: signAccessToken(user), refreshToken: newToken };
}

export async function logout(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
