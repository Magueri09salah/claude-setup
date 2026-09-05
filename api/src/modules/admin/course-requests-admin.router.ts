import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";

// Admin side of "طلبات التسجيل": the leads coming out of the mobile city
// picker. Mounted under the ADMIN role guard.
export const courseRequestsAdminRouter = Router();

const STATUSES = ["PENDING", "CONTACTED", "ENROLLED", "CANCELLED"] as const;

const listQuery = z.strictObject({
  status: z.enum(["all", ...STATUSES]).default("all"),
  city: z.string().trim().max(60).optional(),
  // Username / phone / city, one box like the other pages.
  search: z.string().trim().max(200).optional(),
  // yyyy-mm-dd from the native date inputs, on "requested at".
  from: z.string().trim().max(10).optional(),
  to: z.string().trim().max(10).optional(),
});

const idParam = z.uuid();

const updateSchema = z.strictObject({
  status: z.enum(STATUSES).optional(),
  note: z.string().trim().max(500).nullish(),
});

/** yyyy-mm-dd → start/end of that day, or null when the box is empty. */
function dayBound(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

courseRequestsAdminRouter.get("/course-requests", async (req, res) => {
  const q = listQuery.parse(req.query);
  const from = dayBound(q.from, false);
  const to = dayBound(q.to, true);

  const requests = await prisma.courseRequest.findMany({
    where: {
      ...(q.status === "all" ? {} : { status: q.status }),
      ...(q.city ? { city: q.city } : {}),
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
      ...(q.search
        ? {
            OR: [
              { city: { contains: q.search, mode: "insensitive" as const } },
              { phone: { contains: q.search } },
              {
                user: {
                  is: {
                    OR: [
                      { username: { contains: q.search, mode: "insensitive" as const } },
                      { fullName: { contains: q.search, mode: "insensitive" as const } },
                      { phone: { contains: q.search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
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
        },
      },
    },
  });

  // Demand per city, over the WHOLE table rather than the current filter —
  // "where are my candidates" is the question this page exists to answer.
  const byCity = await prisma.courseRequest.groupBy({
    by: ["city"],
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
  });

  res.json({
    requests: requests.map((r) => ({
      id: r.id,
      city: r.city,
      status: r.status,
      note: r.note,
      // The number captured at request time, falling back to the live profile.
      phone: r.phone ?? r.user.phone,
      createdAt: r.createdAt,
      handledAt: r.handledAt,
      user: r.user,
    })),
    cities: byCity.map((c) => ({ city: c.city, count: c._count.city })),
  });
});

courseRequestsAdminRouter.patch("/course-requests/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateSchema.parse(req.body);
  if (input.status === undefined && input.note === undefined) {
    throw new ApiError(400, "Nothing to update");
  }

  const existing = await prisma.courseRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Request not found");

  const adminId = req.auth!.userId;
  const updated = await prisma.courseRequest.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.note !== undefined ? { note: input.note?.length ? input.note : null } : {}),
      // Stamp who touched the lead only when the status actually moves.
      ...(input.status && input.status !== existing.status
        ? { handledById: adminId, handledAt: new Date() }
        : {}),
    },
  });

  if (input.status && input.status !== existing.status) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: "course_request_status",
        targetType: "course_request",
        targetId: id,
        detail: `${existing.status} → ${input.status} (${existing.city})`,
      },
    });
  }

  res.json({ request: updated });
});

courseRequestsAdminRouter.delete("/course-requests/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.courseRequest.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Request not found");

  await prisma.courseRequest.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      adminId: req.auth!.userId,
      action: "course_request_delete",
      targetType: "course_request",
      targetId: id,
      detail: existing.city,
    },
  });
  res.status(204).end();
});
