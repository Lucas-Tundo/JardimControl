import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

type Client = PrismaClient | Prisma.TransactionClient;

export type AuditInput = {
  entityType: "TASK" | "LOCATION" | "AREA" | "OCCURRENCE" | "USER" | "TEAM" | "RECURRENCE" | "SCHEDULE" | "CHECKLIST" | "REPORT";
  entityId: string;
  action: string;
  summary: string;
  userId?: string | null;
  taskId?: string | null;
  locationId?: string | null;
  details?: unknown;
};

export async function audit(input: AuditInput, client: Client = db) {
  await client.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      userId: input.userId ?? null,
      taskId: input.taskId ?? null,
      locationId: input.locationId ?? null,
      details: input.details === undefined ? null : JSON.stringify(input.details),
    },
  });
}

/** Lista os campos alterados entre dois objetos (para o registro de alterações). */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): { field: string; from: unknown; to: unknown }[] {
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  for (const key of Object.keys(labels)) {
    const a = normalize(before[key]);
    const b = normalize(after[key]);
    if (a !== b) changes.push({ field: labels[key], from: before[key] ?? null, to: after[key] ?? null });
  }
  return changes;
}

function normalize(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (v === undefined || v === null || v === "") return "";
  return String(v);
}
