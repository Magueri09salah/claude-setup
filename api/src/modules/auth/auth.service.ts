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
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    // Effective premium: active flag AND unexpired (premiumUntil null = lifetime).
    isPremium:
      user.isPremium &&
      (user.premiumUntil === null || user.premiumUntil > new Date()),
    // The app shows the candidate when their three months run out, so the
    // lock never arrives as a surprise.
    premiumUntil: user.premiumUntil,
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
  username: string;
  phone: string;
  password: string;
  cinLast3: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  // Hashed like any other secret, even though 3 digits is only 1000 options —
  // a DB leak should not hand out reset codes in plaintext.
  const cinLast3Hash = await bcrypt.hash(input.cinLast3, BCRYPT_COST);
  // Both already normalized by the zod schema; normalize again so a direct
  // service call can't slip past it.
  const username = input.username.trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  try {
    const created = await prisma.user.create({
      data: { username, phone, passwordHash, cinLast3Hash },
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
      // Say WHICH one is taken: "already registered" on a combined message
      // leaves the candidate guessing which field to change.
      const target = (e.meta as { target?: string[] } | undefined)?.target ?? [];
      if (target.includes("phone")) {
        throw new ApiError(409, "رقم الهاتف مسجَّل من قبل");
      }
      throw new ApiError(409, "اسم المستخدم مستعمل من قبل");
    }
    throw e;
  }
}

/**
 * Candidates log in with their phone, the admin panel with its email, and a
 * username works too. One lookup covers all three: the identifier is matched
 * against the phone (normalized) OR the username OR the email, all of which are
 * unique, so it can never resolve to more than one account.
 */
export async function login(input: { identifier: string; password: string }) {
  const raw = input.identifier.trim();
  const lowered = raw.toLowerCase();
  const phone = normalizePhone(raw);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(phone ? [{ phone }] : []),
        { username: lowered },
        { email: lowered },
      ],
    },
  });
  // Always compare against something so a missing account and a wrong password
  // take the same time (no user enumeration through timing).
  const passwordOk = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !passwordOk) {
    throw new ApiError(401, "رقم الهاتف أو كلمة المرور غير صحيحة");
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


/* ---------------- Password reset (phone + last 3 CIN digits) ---------------- */

// A 3-digit secret is 1000 combinations, so the lockout — not the secret — is
// the real protection: 3 wrong tries and that PHONE cannot be reset for 24h.
const MAX_RESET_ATTEMPTS = 3;
const RESET_LOCK_HOURS = 24;
// Long enough to type a new password, short enough to be useless if leaked.
const RESET_TOKEN_TTL = "10m";
const RESET_TOKEN_TYPE = "pwreset";

// One message for every failure. Anything that varies — a remaining-attempts
// count, a different status — tells an attacker whether the number exists.
const RESET_GENERIC = "المعطيات غير صحيحة أو تم تجاوز عدد المحاولات";

/**
 * Consume one attempt for this phone, atomically, BEFORE checking the code.
 *
 * Ordering matters: bcrypt.compare takes ~250ms at cost 12, and the previous
 * version read the counter, compared, then wrote it back — so requests fired in
 * parallel all read the same value and each got a free guess. Incrementing
 * first, in a single conditional statement, makes the 3-per-24h limit hold
 * under concurrency.
 *
 * Keyed by phone, not by user, so an unknown number is throttled and answered
 * identically to a registered one.
 */
async function consumeResetAttempt(phone: string, now: Date): Promise<boolean> {
  // Upsert without incrementing, so the row exists for the conditional update.
  await prisma.passwordResetAttempt.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  // Clear an expired lockout first; from the caller's side this is one budget.
  await prisma.passwordResetAttempt.updateMany({
    where: { phone, lockedUntil: { lte: now } },
    data: { attempts: 0, lockedUntil: null },
  });

  // The guard lives in the WHERE clause: the database decides who gets the
  // attempt, so two concurrent callers cannot both pass on the same budget.
  const claimed = await prisma.passwordResetAttempt.updateMany({
    where: {
      phone,
      attempts: { lt: MAX_RESET_ATTEMPTS },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return false;

  // That may have been the last one — start the lockout now.
  await prisma.passwordResetAttempt.updateMany({
    where: { phone, attempts: { gte: MAX_RESET_ATTEMPTS } },
    data: {
      lockedUntil: new Date(now.getTime() + RESET_LOCK_HOURS * 60 * 60 * 1000),
    },
  });
  return true;
}

/**
 * Step 1: prove ownership with the phone + the CIN digits. Returns a short
 * lived, single-use token that step 2 exchanges for an actual password change.
 */
export async function verifyResetCode(input: {
  phone: string;
  cinLast3: string;
}): Promise<{ resetToken: string }> {
  const phone = normalizePhone(input.phone);
  const now = new Date();

  if (!(await consumeResetAttempt(phone, now))) {
    throw new ApiError(400, RESET_GENERIC);
  }

  const user = await prisma.user.findFirst({ where: { phone } });
  // Unknown phone: same message, and still pay the bcrypt cost so the reply
  // time does not reveal that the account is missing.
  const ok = await bcrypt.compare(
    input.cinLast3,
    user?.cinLast3Hash ?? DUMMY_HASH,
  );
  if (!user?.cinLast3Hash || !ok) {
    throw new ApiError(400, RESET_GENERIC);
  }

  // Correct: hand the budget back and mint a token tied to a fresh nonce.
  const nonce = crypto.randomUUID();
  await prisma.$transaction([
    prisma.passwordResetAttempt.updateMany({
      where: { phone },
      data: { attempts: 0, lockedUntil: null },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { pwResetNonce: nonce },
    }),
  ]);

  const resetToken = jwt.sign(
    { typ: RESET_TOKEN_TYPE, nonce },
    env.JWT_ACCESS_SECRET,
    { subject: user.id, expiresIn: RESET_TOKEN_TTL },
  );
  return { resetToken };
}

/** Step 2: set the new password and end every existing session. */
export async function resetPassword(input: {
  resetToken: string;
  newPassword: string;
}): Promise<void> {
  let userId: string;
  let nonce: string;
  try {
    const payload = jwt.verify(input.resetToken, env.JWT_ACCESS_SECRET);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.nonce !== "string" ||
      // Without this an ordinary access token would also change the password.
      payload.typ !== RESET_TOKEN_TYPE
    ) {
      throw new Error("bad token");
    }
    userId = payload.sub;
    nonce = payload.nonce;
  } catch {
    throw new ApiError(401, "انتهت صلاحية الطلب — أعد المحاولة");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);

  // Clearing the nonce in the same conditional update makes the token
  // single-use: a replay finds no matching row and changes nothing.
  const consumed = await prisma.user.updateMany({
    where: { id: userId, pwResetNonce: nonce },
    data: { passwordHash, pwResetNonce: null },
  });
  if (consumed.count === 0) {
    throw new ApiError(401, "انتهت صلاحية الطلب — أعد المحاولة");
  }

  // A password change must not leave old sessions alive.
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
