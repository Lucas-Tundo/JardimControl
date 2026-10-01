import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { photoInclude } from "./queries";

export const locationOverviewInclude = {
  area: true,
  qrCode: true,
  responsibleUser: { select: { name: true } },
  responsibleTeam: { select: { name: true } },
  photos: { where: { stage: "REFERENCIA" }, include: photoInclude, orderBy: { createdAt: "desc" as const } },
  tasks: {
    where: { deletedAt: null },
    include: {
      assigneeUser: { select: { id: true, name: true } },
      assigneeTeam: { select: { id: true, name: true } },
      checklist: { orderBy: { order: "asc" as const }, select: { id: true, text: true, required: true, done: true } },
      photos: { where: { stage: { in: ["ANTES", "DEPOIS"] } }, include: photoInclude, orderBy: { takenAt: "asc" as const } },
    },
    orderBy: { scheduledAt: "desc" as const },
  },
  occurrences: {
    include: { reportedBy: { select: { name: true } }, photos: { include: photoInclude } },
    orderBy: { createdAt: "desc" as const },
  },
  auditLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" as const }, take: 30 },
} satisfies Prisma.LocationInclude;

export type LocationOverview = Prisma.LocationGetPayload<{ include: typeof locationOverviewInclude }>;

export async function getLocationOverview(where: Prisma.LocationWhereUniqueInput): Promise<LocationOverview | null> {
  return db.location.findUnique({ where, include: locationOverviewInclude });
}

export function summarizeLocation(loc: LocationOverview, now = new Date()) {
  const open = loc.tasks.filter((t) => !["CONCLUIDA", "CANCELADA"].includes(t.status));
  const completed = loc.tasks.filter((t) => t.status === "CONCLUIDA");
  const lastCompleted = [...completed].sort((a, b) => (b.approvedAt?.getTime() ?? 0) - (a.approvedAt?.getTime() ?? 0))[0];
  const upcoming = open.filter((t) => t.scheduledAt >= now || t.status !== "PROGRAMADA").sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const next = open.filter((t) => ["PROGRAMADA", "PENDENTE", "ATRASADA"].includes(t.status)).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
  const openOccurrences = loc.occurrences.filter((o) => o.status === "ABERTA");
  return { open, completed, lastCompleted, upcoming, next, openOccurrences };
}
