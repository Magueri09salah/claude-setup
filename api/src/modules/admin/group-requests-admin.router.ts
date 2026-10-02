import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { extendPremium, PREMIUM_MONTHS } from "../premium/duration";

/**
 * Admin side of «طلبات التسجيل في المجموعة» — the in-app requests coming from
 * the unlock screen.
 *
 * Mounted in the ASSISTANT-VISIBLE part of admin.router: answering these is
 * the same job as the free-access group and the renew button, both of which an
 * assistant already handles, so this grants no privilege they did not have.
 */
export const groupRequestsAdminRouter = Router();

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

const listQuery = z.strictObject({
  status: z.enum(["all", ...STATUSES]).default("all"),
  // Username / full name / phone, one box like the other pages.
  search: z.string().trim().max(200).optional(),
  // yyyy-mm-dd from the native date inputs, on "requested at".
  from: z.string().trim().max(10).optional(),
  to: z.string().trim().max(10).optional(),
});

const idParam = z.uuid();

/**
 * APPROVED is deliberately NOT settable here. Approving grants three months of
 * access, so it goes through /approve where the grant and the audit entry
 * happen together — otherwise a row could read "مقبول" while the candidate's
 * account was never actually opened.
 */
const updateSchema = z.strictObject({
  status: z.enum(["PENDING", "REJECTED"]).optional(),
  note: z.string().trim().max(500).nullish(),
});

/** yyyy-mm-dd → start/end of that day, or null when the box is empty. */
function dayBound(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value) return null;
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

groupRequestsAdminRouter.get("/group-requests", async (req, res) => {
  const q = listQuery.parse(req.query);
  const from = dayBound(q.from, false);
  const to = dayBound(q.to, true);

  const requests = await prisma.groupRequest.findMany({
    where: {
      ...(q.status === "all" ? {} : { status: q.status }),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { phone: { contains: q.search } },
              {
                user: {
                  is: {
                    OR: [
                      {
                        username: {
                          contains: q.search,
                          mode: "insensitive" as const,
                        },
                      },
                      {
                        fullName: {
                          contains: q.search,
                          mode: "insensitive" as const,
                        },
                      },
                      { phone: { contains: q.search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    // Oldest PENDING first would bury new asks; the owner works newest-first
    // on every other page, so keep that habit here too.
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          isPremium: true,
          premiumUntil: true,
        },
      },
    },
  });

  const now = new Date();
  res.json({
    requests: requests.map((r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      // The number captured at request time, falling back to the live profile.
      phone: r.phone ?? r.user.phone,
      createdAt: r.createdAt,
      handledAt: r.handledAt,
      user: {
        ...r.user,
        // Same rule as المستخدمون: the flag alone is not access, the term has
        // to still be running. A row whose candidate already expired must not
        // look "مشترك" when the point of the page is to decide about them.
        isPremium:
          r.user.isPremium &&
          (r.user.premiumUntil === null || r.user.premiumUntil > now),
      },
    })),
  });
});

/**
 * «قبول» — grant this candidate PREMIUM_MONTHS of access and mark the request
 * approved, in one transaction.
 *
 * This is a third server-side grant path alongside the payment webhook and the
 * phone allowlist. It obeys the same two rules as the others: the client never
 * asserts entitlement, and every grant is written to AuditLog.
 *
 * It does NOT add the number to PremiumPhone. The candidate already has an
 * account — that list exists to catch people who register LATER — and a row
 * created here would be born already claimed, cluttering المجموعة المجانية
 * with entries nobody can act on.
 */
groupRequestsAdminRouter.post("/group-requests/:id/approve", async (req, res) => {
  const id = idParam.parse(req.params.id);
  z.strictObject({}).parse(req.body ?? {});

  const request = await prisma.groupRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, premiumUntil: true } } },
  });
  if (!request) throw new ApiError(404, "Request not found");

  const adminId = req.auth!.userId;
  // Renewing while still active ADDS to the remaining time; an expired or new
  // account starts three months from today. Single source: premium/duration.
  const premiumUntil = extendPremium(request.user.premiumUntil);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: request.userId },
      data: { isPremium: true, premiumUntil },
    }),
    prisma.groupRequest.update({
      where: { id },
      data: { status: "APPROVED", handledById: adminId, handledAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        adminId,
        action: "grant_premium_group_request",
        targetType: "user",
        targetId: request.userId,
        detail: `group request ${id} — ${PREMIUM_MONTHS} months, until ${premiumUntil
          .toISOString()
          .slice(0, 10)}`,
      },
    }),
  ]);

  res.json({ id, status: "APPROVED", premiumUntil });
});

groupRequestsAdminRouter.patch("/group-requests/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateSchema.parse(req.body);
  if (input.status === undefined && input.note === undefined) {
    throw new ApiError(400, "Nothing to update");
  }

  const existing = await prisma.groupRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Request not found");

  const adminId = req.auth!.userId;
  const updated = await prisma.groupRequest.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.note !== undefined
        ? { note: input.note?.length ? input.note : null }
        : {}),
      // Stamp who touched it only when the status actually moves.
      ...(input.status && input.status !== existing.status
        ? { handledById: adminId, handledAt: new Date() }
        : {}),
    },
  });

  if (input.status && input.status !== existing.status) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "group_request_status",
        targetType: "group_request",
        targetId: id,
        detail: `${existing.status} → ${input.status}`,
      },
    });
  }

  // Rejecting does NOT take access away. Someone may have been granted for a
  // different reason in the meantime, and silently expiring an account from
  // this page would be impossible to trace back.
  res.json({ request: updated });
});

groupRequestsAdminRouter.delete("/group-requests/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.groupRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Request not found");

  await prisma.groupRequest.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      adminId: req.auth!.userId,
      action: "group_request_delete",
      targetType: "group_request",
      targetId: id,
      detail: existing.phone ?? existing.userId,
    },
  });
  res.status(204).end();
});
