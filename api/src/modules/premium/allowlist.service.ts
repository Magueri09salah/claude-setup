import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { normalizePhone, phoneVariants } from "./phone";

/**
 * Premium has exactly two legitimate sources: a verified payment webhook, and
 * this admin-managed allowlist (partner driving-school groups). Both are
 * server-side — the client never asserts entitlement, it only supplies a phone
 * number and the API decides. Every grant is written to AuditLog.
 */
const GRANT_ACTION = "grant_premium_allowlist";

/** Grants lifetime premium and records who/why. Idempotent per user. */
async function grantPremium(
  tx: Prisma.TransactionClient,
  userId: string,
  adminId: string,
  detail: string,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    // premiumUntil null = lifetime, matching a fully paid account.
    data: { isPremium: true, premiumUntil: null },
  });
  await tx.auditLog.create({
    data: {
      adminId,
      action: GRANT_ACTION,
      targetType: "user",
      targetId: userId,
      detail,
    },
  });
}

/**
 * Called right after a user registers. If their number is on the allowlist,
 * unlock everything and mark the entry claimed. Returns true when granted.
 */
export async function applyAllowlistOnRegister(
  userId: string,
  rawPhone: string | null | undefined,
): Promise<boolean> {
  if (!rawPhone) return false;
  const phone = normalizePhone(rawPhone);
  if (!phone) return false;

  const entry = await prisma.premiumPhone.findUnique({ where: { phone } });
  if (!entry) return false;

  await prisma.$transaction(async (tx) => {
    await grantPremium(
      tx,
      userId,
      entry.addedById,
      `allowlist ${phone}${entry.note ? ` (${entry.note})` : ""}`,
    );
    // First claimant wins the record; the number stays usable for nobody else
    // because User.phone is unique anyway.
    await tx.premiumPhone.update({
      where: { id: entry.id },
      data: { claimedAt: new Date(), claimedBy: userId },
    });
  });
  return true;
}

/**
 * Called when the admin adds a number. Someone may have registered with that
 * number BEFORE it was added, so unlock them now instead of making them
 * re-register — this is the common case when a group is onboarded late.
 */
export async function applyAllowlistToExistingUser(
  phone: string,
  adminId: string,
  note: string | null,
): Promise<string | null> {
  // Match legacy rows too: phones stored before normalization existed.
  const user = await prisma.user.findFirst({
    where: { phone: { in: phoneVariants(phone) } },
  });
  if (!user) return null;

  await prisma.$transaction(async (tx) => {
    if (!user.isPremium || user.premiumUntil !== null) {
      await grantPremium(
        tx,
        user.id,
        adminId,
        `allowlist ${phone}${note ? ` (${note})` : ""} — existing account`,
      );
    }
    await tx.premiumPhone.update({
      where: { phone },
      data: { claimedAt: new Date(), claimedBy: user.id },
    });
  });
  return user.id;
}
