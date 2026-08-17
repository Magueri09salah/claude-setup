import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { applyAllowlistToExistingUser } from "../premium/allowlist.service";
import {
  isValidMoroccanMobile,
  normalizePhone,
  phoneVariants,
} from "../premium/phone";

// Phone allowlist: members of a partner group get premium without paying.
// Mounted under the ADMIN role guard.
export const allowlistRouter = Router();

const addSchema = z.strictObject({
  // One per line / comma / space — the admin pastes a list from WhatsApp.
  phones: z.string().min(1).max(20_000),
  note: z.string().trim().max(200).optional(),
});

const idParam = z.uuid();

allowlistRouter.get("/allowlist", async (_req, res) => {
  const entries = await prisma.premiumPhone.findMany({
    orderBy: { createdAt: "desc" },
  });
  // Show who claimed each number so the admin can see the group filling up.
  const userIds = entries.flatMap((e) => (e.claimedBy ? [e.claimedBy] : []));
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, email: true, fullName: true },
        })
      : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json({
    entries: entries.map((e) => ({
      ...e,
      claimedUser: e.claimedBy ? (byId.get(e.claimedBy) ?? null) : null,
    })),
  });
});

allowlistRouter.post("/allowlist", async (req, res) => {
  const input = addSchema.parse(req.body);
  const adminId = req.auth!.userId;
  const note = input.note?.length ? input.note : null;

  const raw = input.phones
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (raw.length === 0) throw new ApiError(400, "No phone numbers provided");
  if (raw.length > 500) throw new ApiError(400, "Max 500 numbers per request");

  const added: string[] = [];
  const invalid: string[] = [];
  const duplicate: string[] = [];
  // Users unlocked right away because they had already registered.
  const grantedNow: string[] = [];

  for (const item of raw) {
    const phone = normalizePhone(item);
    if (!isValidMoroccanMobile(phone)) {
      invalid.push(item);
      continue;
    }
    const exists = await prisma.premiumPhone.findUnique({ where: { phone } });
    if (exists) {
      duplicate.push(phone);
      continue;
    }
    await prisma.premiumPhone.create({
      data: { phone, note, addedById: adminId },
    });
    added.push(phone);
    // Someone may already have an account with this number.
    const userId = await applyAllowlistToExistingUser(phone, adminId, note);
    if (userId) grantedNow.push(phone);
  }

  res.status(201).json({ added, invalid, duplicate, grantedNow });
});

allowlistRouter.delete("/allowlist/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const entry = await prisma.premiumPhone.findUnique({ where: { id } });
  if (!entry) throw new ApiError(404, "Number not found");
  await prisma.premiumPhone.delete({ where: { id } });
  // Deliberately does NOT revoke premium already granted: taking access away
  // silently would look like a bug to the candidate. Revoking is a separate,
  // explicit action on the Users page.
  res.status(204).end();
});

/** Does this number already have premium access? Used by the admin UI hint. */
allowlistRouter.get("/allowlist/lookup", async (req, res) => {
  const phone = normalizePhone(String(req.query.phone ?? ""));
  if (!isValidMoroccanMobile(phone)) {
    throw new ApiError(400, "Invalid phone number");
  }
  const [entry, user] = await Promise.all([
    prisma.premiumPhone.findUnique({ where: { phone } }),
    prisma.user.findFirst({
      where: { phone: { in: phoneVariants(phone) } },
      select: { id: true, email: true, isPremium: true },
    }),
  ]);
  res.json({ phone, onList: !!entry, user });
});
