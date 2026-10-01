import type { RecurringMaintenance } from "@prisma/client";
import { db } from "./db";
import { addDays, addMonths, dateKey, endOfDay, formatDate, fromLocal, startOfDay } from "./dates";
import { notifyTaskAssignees } from "./notify";
import { audit } from "./audit";
import { nextTaskNumber, parseChecklistJson, statusForSchedule } from "./tasks";

export const GENERATION_HORIZON_DAYS = 30;

export function nextOccurrenceDate(date: Date, frequency: string, intervalDays?: number | null): Date {
  switch (frequency) {
    case "DIARIA":
      return addDays(date, 1);
    case "SEMANAL":
      return addDays(date, 7);
    case "QUINZENAL":
      return addDays(date, 15);
    case "MENSAL":
      return addMonths(date, 1);
    case "PERSONALIZADA":
      return addDays(date, Math.max(1, intervalDays ?? 1));
    default:
      return addDays(date, 36500);
  }
}

/** Gera as tarefas de uma manutenção recorrente até o horizonte definido. Retorna quantas criou. */
export async function generateForRecurrence(rec: RecurringMaintenance, actorId?: string): Promise<number> {
  if (!rec.active) return 0;
  const now = new Date();
  const horizon = endOfDay(addDays(now, GENERATION_HORIZON_DAYS));
  const limit = rec.endDate && rec.endDate < horizon ? endOfDay(rec.endDate) : horizon;

  let cursor = rec.lastGeneratedDate
    ? nextOccurrenceDate(rec.lastGeneratedDate, rec.frequency, rec.intervalDays)
    : fromLocal(dateKey(rec.startDate), rec.timeOfDay);
  // Não gera tarefas retroativas com mais de 1 dia de atraso.
  const floor = startOfDay(addDays(now, -1));
  while (cursor < floor) cursor = nextOccurrenceDate(cursor, rec.frequency, rec.intervalDays);

  const template = rec.checklistTemplateId
    ? await db.checklistTemplateItem.findMany({ where: { templateId: rec.checklistTemplateId }, orderBy: { order: "asc" } })
    : [];
  const checklist = parseChecklistJson(rec.checklistJson);
  const items = checklist.length ? checklist : template.map((t) => ({ text: t.text, required: t.required }));

  const dates: Date[] = [];
  while (cursor <= limit && dates.length < 400) {
    dates.push(fromLocal(dateKey(cursor), rec.timeOfDay));
    cursor = nextOccurrenceDate(cursor, rec.frequency, rec.intervalDays);
  }
  if (!dates.length) return 0;

  await db.$transaction(async (tx) => {
    let number = await nextTaskNumber(tx);
    for (const scheduledAt of dates) {
      const dueAt = new Date(scheduledAt.getTime() + rec.durationHours * 3600 * 1000);
      const task = await tx.task.create({
        data: {
          number: number++,
          title: rec.title,
          instructions: rec.instructions,
          type: rec.type,
          priority: rec.priority,
          status: statusForSchedule(scheduledAt, dueAt),
          periodicity: rec.frequency,
          origin: "RECORRENTE",
          locationId: rec.locationId,
          areaId: rec.areaId,
          assigneeUserId: rec.assigneeUserId,
          assigneeTeamId: rec.assigneeTeamId,
          scheduleId: rec.scheduleId,
          recurrenceId: rec.id,
          scheduledAt,
          dueAt,
          createdById: actorId ?? rec.createdById,
          checklist: { create: items.map((i, idx) => ({ text: i.text, required: i.required, order: idx })) },
        },
      });
      await audit(
        {
          entityType: "TASK",
          entityId: task.id,
          action: "CRIADA",
          summary: `Tarefa gerada automaticamente pela recorrência "${rec.title}"`,
          userId: actorId ?? null,
          taskId: task.id,
          locationId: rec.locationId,
        },
        tx,
      );
    }
    await tx.recurringMaintenance.update({ where: { id: rec.id }, data: { lastGeneratedDate: dates[dates.length - 1] } });
    await notifyTaskAssignees(
      rec,
      {
        type: "MANUTENCAO_PROGRAMADA",
        title: "Nova manutenção programada",
        message:
          dates.length === 1
            ? `${rec.title} em ${formatDate(dates[0])}`
            : `${rec.title}: ${dates.length} manutenções programadas a partir de ${formatDate(dates[0])}`,
        link: "/agenda",
      },
      tx,
    );
  });
  return dates.length;
}

export async function generateAllRecurrences(): Promise<number> {
  const recs = await db.recurringMaintenance.findMany({ where: { active: true } });
  let total = 0;
  for (const rec of recs) total += await generateForRecurrence(rec);
  return total;
}
