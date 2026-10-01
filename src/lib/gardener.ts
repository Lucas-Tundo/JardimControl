import type { Prisma } from "@prisma/client";
import type { GardenerCardTask } from "@/components/gardener-task-card";
import { photoInclude, toPhotoView } from "./queries";
import { isLate } from "./tasks";

export const gardenerCardInclude = {
  location: {
    select: {
      id: true,
      name: true,
      photos: { where: { stage: "REFERENCIA" }, include: photoInclude, orderBy: { createdAt: "desc" as const }, take: 6 },
    },
  },
  assigneeTeam: { select: { name: true } },
  checklist: { select: { done: true } },
  photos: { where: { stage: { in: ["REFERENCIA", "ANTES"] } }, include: photoInclude, orderBy: { takenAt: "asc" as const } },
} satisfies Prisma.TaskInclude;

export type GardenerTaskRow = Prisma.TaskGetPayload<{ include: typeof gardenerCardInclude }>;

export function toGardenerCard(t: GardenerTaskRow, now = new Date()): GardenerCardTask {
  return {
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    status: t.status,
    late: isLate(t, now),
    scheduledAt: t.scheduledAt,
    dueAt: t.dueAt,
    location: t.location.name,
    team: t.assigneeTeam?.name ?? null,
    returned: t.returnCount > 0 && t.status !== "AGUARDANDO_APROVACAO" && t.status !== "CONCLUIDA" ? t.lastReturnReason : null,
    checklistDone: t.checklist.filter((c) => c.done).length,
    checklistTotal: t.checklist.length,
    photos: [...t.photos, ...t.location.photos].map(toPhotoView),
  };
}
