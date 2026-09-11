import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../../middleware/auth";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";

// Panel account management: staff change their own sign-in details here, and
// the owner creates and manages assistant accounts. Mounted under requireStaff;
// the owner-only routes carry requireAdmin themselves.
export const accountAdminRouter = Router();

const BCRYPT_COST = 12;

// Same floor as candidate registration. The panel can grant free access to the
// whole catalogue, so a short password here is worth more to an attacker.
const passwordSchema = z.string().min(8).max(72);
const emailSchema = z.string().trim().toLowerCase().email().max(200);
const idParam = z.uuid();

/**
 * Change your own email and/or password.
 *
 * The current password is required for BOTH: an access token lasts 15 minutes,
 * and without this check anyone who borrowed an unlocked laptop could change
 * the address and password and keep the account for themselves.
 */
const updateMeSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(72),
    email: emailSchema.optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((v) => v.email !== undefined || v.newPassword !== undefined, {
    message: "Nothing to change",
  });

accountAdminRouter.get("/account/me", async (req, res) => {
  const me = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, email: true, username: true, role: true },
  });
  if (!me) throw new ApiError(401, "Unknown user");
  res.json({ account: me });
});

accountAdminRouter.patch("/account/me", async (req, res) => {
  const input = updateMeSchema.parse(req.body);
  const me = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!me) throw new ApiError(401, "Unknown user");

  const ok = await bcrypt.compare(input.currentPassword, me.passwordHash);
  if (!ok) throw new ApiError(403, "كلمة المرور الحالية غير صحيحة");

  if (input.email && input.email !== me.email) {
    const taken = await prisma.user.findUnique({ where: { email: input.email } });
    if (taken) throw new ApiError(409, "هذا البريد مستعمل بالفعل");
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(input.email ? { email: input.email } : {}),
      ...(input.newPassword
        ? { passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_COST) }
        : {}),
    },
  });

  // A password change must end every OTHER session. Without this, a device that
  // was already signed in keeps working — which defeats changing it after a
  // suspected compromise.
  if (input.newPassword) {
    await prisma.refreshToken.updateMany({
      where: { userId: me.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      adminId: me.id,
      action: "account_self_update",
      targetType: "user",
      targetId: me.id,
      detail: [input.email ? "email" : null, input.newPassword ? "password" : null]
        .filter(Boolean)
        .join(", "),
    },
  });

  res.json({ ok: true, signedOutOtherDevices: Boolean(input.newPassword) });
});

// ── Assistant accounts — owner only ─────────────────────────────────────────

accountAdminRouter.get("/account/staff", requireAdmin, async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: "ASSISTANT" },
    select: { id: true, email: true, username: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ staff });
});

const createStaffSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

accountAdminRouter.post("/account/staff", requireAdmin, async (req, res) => {
  const input = createStaffSchema.parse(req.body);

  const taken = await prisma.user.findUnique({ where: { email: input.email } });
  if (taken) throw new ApiError(409, "هذا البريد مستعمل بالفعل");

  // `username` is unique and is one of the accepted login identifiers, so it
  // has to be filled and distinct — the local part of the email is both.
  const base = input.email.split("@")[0]!;
  let username = base;
  for (let n = 2; await prisma.user.findUnique({ where: { username } }); n++) {
    username = `${base}${n}`;
  }

  const staff = await prisma.user.create({
    data: {
      email: input.email,
      username,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
      role: "ASSISTANT",
    },
    select: { id: true, email: true, username: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      adminId: req.auth!.userId,
      action: "staff_create",
      targetType: "user",
      targetId: staff.id,
      detail: `assistant ${staff.email}`,
    },
  });

  res.status(201).json({ staff });
});

const resetStaffSchema = z.strictObject({ password: passwordSchema });

accountAdminRouter.patch(
  "/account/staff/:id/password",
  requireAdmin,
  async (req, res) => {
    const id = idParam.parse(req.params.id);
    const input = resetStaffSchema.parse(req.body);

    const staff = await prisma.user.findUnique({ where: { id } });
    // Scoped to ASSISTANT on purpose: this route must never be a way to take
    // over another owner's account.
    if (!staff || staff.role !== "ASSISTANT") {
      throw new ApiError(404, "Assistant not found");
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) },
    });
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        adminId: req.auth!.userId,
        action: "staff_reset_password",
        targetType: "user",
        targetId: id,
        detail: staff.email ?? "",
      },
    });

    res.json({ ok: true });
  },
);

accountAdminRouter.delete("/account/staff/:id", requireAdmin, async (req, res) => {
  const id = idParam.parse(req.params.id);
  const staff = await prisma.user.findUnique({ where: { id } });
  if (!staff || staff.role !== "ASSISTANT") {
    throw new ApiError(404, "Assistant not found");
  }

  await prisma.refreshToken.deleteMany({ where: { userId: id } });
  await prisma.device.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      adminId: req.auth!.userId,
      action: "staff_delete",
      targetType: "user",
      targetId: id,
      detail: staff.email ?? "",
    },
  });

  res.status(204).end();
});
