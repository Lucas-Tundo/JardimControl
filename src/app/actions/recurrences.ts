"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isLeader } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromLocal } from "@/lib/dates";
import { generateForRecurrence } from "@/lib/recurrence";
import { parseChecklistJson } from "@/lib/tasks";
import { MAINTENANCE_TYPES, PERIODICITIES, PRIORITIES, labelOf } from "@/lib/constants";
import { fail, num, oneOf, optStr, parseAssignee, str, type ActionResult } from "@/lib/action-utils";
import { plural } from "@/lib/text";

async function leader() {
  const user = await getCurrentUser();
  return user && isLeader(user) ? user : null;
}

export async function saveRecurrence(id: string | null, form: FormData): Promise<ActionResult<{ id: string; generated: number }>> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");

  const title = str(form, "title");
  const type = oneOf(str(form, "type"), MAINTENANCE_TYPES);
  const frequency = oneOf(str(form, "frequency"), PERIODICITIES);
  const priority = oneOf(str(form, "priority"), PRIORITIES, "MEDIA") ?? "MEDIA";
  const locationId = str(form, "locationId");
  const startDate = str(form, "startDate");
  const endDate = str(form, "endDate");
  const timeOfDay = str(form, "timeOfDay") || "08:00";
  const intervalDays = num(form, "intervalDays");
  const durationHours = Math.max(1, Math.round(num(form, "durationHours") ?? 8));
  const { assigneeUserId, assigneeTeamId } = parseAssignee(str(form, "assignee"));
  const checklistTemplateId = optStr(form, "checklistTemplateId");
  const checklist = parseChecklistJson(str(form, "checklist"));

  if (title.length < 3) return fail("Informe o título.");
  if (!type) return fail("Selecione o tipo de manutenção.");
  if (!frequency || frequency === "UNICA") return fail("Selecione a frequência.");
  if (frequency === "PERSONALIZADA" && (!intervalDays || intervalDays < 1)) return fail("Informe o intervalo em dias.");
  if (!assigneeUserId && !assigneeTeamId) return fail("Selecione o responsável.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return fail("Informe a data inicial.");
  if (endDate && endDate < startDate) return fail("A data final deve ser posterior à inicial.");
  const location = await db.location.findUnique({ where: { id: locationId } });
  if (!location) return fail("Selecione o local.");

  const data = {
    title,
    type,
    frequency,
    priority,
    instructions: optStr(form, "instructions"),
    locationId,
    areaId: location.areaId,
    assigneeUserId,
    assigneeTeamId,
    scheduleId: optStr(form, "scheduleId"),
    checklistTemplateId,
    checklistJson: JSON.stringify(checklist),
    intervalDays: intervalDays ? Math.round(intervalDays) : null,
    startDate: fromLocal(startDate, timeOfDay),
    endDate: endDate ? fromLocal(endDate, "23:59") : null,
    timeOfDay,
    durationHours,
  };

  let recId: string;
  if (id) {
    await db.recurringMaintenance.update({ where: { id }, data });
    // Atualiza as próximas tarefas ainda não iniciadas desta recorrência
    await db.task.updateMany({
      where: { recurrenceId: id, deletedAt: null, status: { in: ["PROGRAMADA"] } },
      data: { title, type, priority, instructions: data.instructions, assigneeUserId, assigneeTeamId, locationId, areaId: location.areaId },
    });
    recId = id;
  } else {
    const rec = await db.recurringMaintenance.create({ data: { ...data, createdById: user.id } });
    recId = rec.id;
  }
  await audit({ entityType: "RECURRENCE", entityId: recId, action: id ? "ALTERADA" : "CRIADA", summary: `Recorrência "${title}" (${labelOf(PERIODICITIES, frequency)}) ${id ? "atualizada" : "criada"}`, userId: user.id, locationId });
  const rec = await db.recurringMaintenance.findUnique({ where: { id: recId } });
  const generated = rec ? await generateForRecurrence(rec, user.id) : 0;
  revalidatePath("/", "layout");
  return { ok: true, data: { id: recId, generated }, message: generated ? `${plural(generated, "tarefa gerada", "tarefas geradas")} automaticamente.` : "Recorrência salva." };
}

export async function toggleRecurrence(id: string): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const rec = await db.recurringMaintenance.findUnique({ where: { id } });
  if (!rec) return fail("Recorrência não encontrada.");
  await db.recurringMaintenance.update({ where: { id }, data: { active: !rec.active } });
  if (rec.active) {
    // Ao pausar, cancela as tarefas futuras ainda programadas
    await db.task.updateMany({ where: { recurrenceId: id, status: "PROGRAMADA", deletedAt: null }, data: { status: "CANCELADA", cancelReason: "Recorrência pausada" } });
  }
  await audit({ entityType: "RECURRENCE", entityId: id, action: rec.active ? "PAUSADA" : "REATIVADA", summary: `Recorrência "${rec.title}" ${rec.active ? "pausada" : "reativada"}`, userId: user.id, locationId: rec.locationId });
  if (!rec.active) {
    const updated = await db.recurringMaintenance.findUnique({ where: { id } });
    if (updated) await generateForRecurrence(updated, user.id);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveSchedule(form: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const name = str(form, "name");
  const start = str(form, "startDate");
  const end = str(form, "endDate");
  if (!name || !start) return fail("Informe nome e data inicial do cronograma.");
  const s = await db.schedule.create({
    data: { name, description: optStr(form, "description"), startDate: fromLocal(start), endDate: end ? fromLocal(end, "23:59") : null, createdById: user.id },
  });
  await audit({ entityType: "SCHEDULE", entityId: s.id, action: "CRIADO", summary: `Cronograma "${name}" criado`, userId: user.id });
  revalidatePath("/", "layout");
  return { ok: true, data: { id: s.id }, message: "Cronograma criado." };
}
