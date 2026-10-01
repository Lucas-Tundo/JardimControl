import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { photoInclude } from "./queries";

export const taskDetailInclude = {
  location: { include: { area: true, photos: { where: { stage: "REFERENCIA" }, include: photoInclude, orderBy: { createdAt: "desc" as const } } } },
  area: true,
  assigneeUser: { select: { id: true, name: true } },
  assigneeTeam: { select: { id: true, name: true, members: { select: { user: { select: { name: true } } } } } },
  schedule: { select: { id: true, name: true } },
  recurrence: { select: { id: true, title: true, frequency: true, intervalDays: true } },
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
  approvedBy: { select: { name: true } },
  checklist: { include: { doneBy: { select: { name: true } } }, orderBy: { order: "asc" as const } },
  photos: { include: photoInclude, orderBy: { takenAt: "asc" as const } },
  timeLogs: { include: { user: { select: { name: true } } }, orderBy: { startedAt: "asc" as const } },
  approvals: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
  occurrences: { include: { reportedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
  fromOccurrence: { include: { reportedBy: { select: { name: true } } } },
  auditLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.TaskInclude;

export type TaskDetail = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;

export async function getTaskDetail(id: string): Promise<TaskDetail | null> {
  const task = await db.task.findUnique({ where: { id }, include: taskDetailInclude });
  if (!task || task.deletedAt) return null;
  return task;
}
