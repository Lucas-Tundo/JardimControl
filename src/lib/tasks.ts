import type { Prisma, PrismaClient } from "@prisma/client";
import { endOfDay } from "./dates";
import type { TaskStatus } from "./constants";

type Client = PrismaClient | Prisma.TransactionClient;

/** Status correto para uma tarefa ainda não iniciada, conforme data programada e prazo. */
export function statusForSchedule(scheduledAt: Date, dueAt: Date, now = new Date()): TaskStatus {
  if (dueAt.getTime() < now.getTime()) return "ATRASADA";
  if (scheduledAt.getTime() <= endOfDay(now).getTime()) return "PENDENTE";
  return "PROGRAMADA";
}

export async function nextTaskNumber(client: Client): Promise<number> {
  const last = await client.task.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 0) + 1;
}

export async function nextOccurrenceNumber(client: Client): Promise<number> {
  const last = await client.occurrence.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 0) + 1;
}

export function taskCode(n: number): string {
  return `JC-${n.toString().padStart(4, "0")}`;
}

export function occurrenceCode(n: number): string {
  return `OC-${n.toString().padStart(4, "0")}`;
}

/** Tarefa em andamento com prazo vencido também conta como atrasada. */
export function isLate(task: { status: string; dueAt: Date }, now = new Date()): boolean {
  if (task.status === "ATRASADA") return true;
  return task.status === "EM_ANDAMENTO" && task.dueAt.getTime() < now.getTime();
}

export function lateWhere(now = new Date()): Prisma.TaskWhereInput {
  return { OR: [{ status: "ATRASADA" }, { status: "EM_ANDAMENTO", dueAt: { lt: now } }] };
}

export type ChecklistInput = { text: string; required: boolean };

export function parseChecklistJson(json: string | null | undefined): ChecklistInput[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .map((i) => ({ text: String(i?.text ?? "").trim(), required: Boolean(i?.required) }))
      .filter((i) => i.text.length > 0);
  } catch {
    return [];
  }
}

/** Inclusões padrão usadas nas listagens de tarefas. */
export const taskListInclude = {
  location: { select: { id: true, name: true, code: true } },
  area: { select: { id: true, name: true } },
  assigneeUser: { select: { id: true, name: true } },
  assigneeTeam: { select: { id: true, name: true, color: true } },
  checklist: { select: { done: true, required: true } },
  _count: { select: { photos: true } },
} satisfies Prisma.TaskInclude;

export type TaskListItem = Prisma.TaskGetPayload<{ include: typeof taskListInclude }>;

export function assigneeName(task: {
  assigneeUser?: { name: string } | null;
  assigneeTeam?: { name: string } | null;
}): string {
  return task.assigneeUser?.name ?? task.assigneeTeam?.name ?? "Sem responsável";
}
