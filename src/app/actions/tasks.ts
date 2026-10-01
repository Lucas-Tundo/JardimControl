"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin, isLeader, type SessionUser } from "@/lib/auth";
import { audit, diffFields } from "@/lib/audit";
import { notifyLeaders, notifyTaskAssignees } from "@/lib/notify";
import { imagesFrom, saveImage, saveImages } from "@/lib/files";
import { dateKey, formatDate, formatDateTime, fromLocal, timeKey } from "@/lib/dates";
import { generateForRecurrence } from "@/lib/recurrence";
import { nextTaskNumber, parseChecklistJson, statusForSchedule, taskCode } from "@/lib/tasks";
import {
  MAINTENANCE_TYPES,
  NOT_STARTED,
  PERIODICITIES,
  PRIORITIES,
  TASK_ORIGINS,
  labelOf,
  type TaskStatus,
} from "@/lib/constants";
import { errorMessage, fail, num, oneOf, optStr, parseAssignee, str, type ActionResult } from "@/lib/action-utils";
import { plural } from "@/lib/text";

async function leaderOrFail(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && isLeader(user) ? user : null;
}

function revalidateTasks() {
  revalidatePath("/", "layout");
}

type ParsedTaskForm = {
  title: string;
  description: string | null;
  instructions: string | null;
  locationId: string;
  assigneeUserId: string | null;
  assigneeTeamId: string | null;
  scheduledAt: Date;
  dueAt: Date;
  type: string;
  priority: string;
  periodicity: string;
  intervalDays: number | null;
  recurrenceEnd: Date | null;
  scheduleId: string | null;
  checklist: { id?: string; text: string; required: boolean }[];
};

function parseTaskForm(form: FormData): ParsedTaskForm | string {
  const title = str(form, "title");
  const locationId = str(form, "locationId");
  const date = str(form, "date");
  const time = str(form, "time") || "08:00";
  const dueDate = str(form, "dueDate") || date;
  const dueTime = str(form, "dueTime") || "18:00";
  const type = oneOf(str(form, "type"), MAINTENANCE_TYPES);
  const priority = oneOf(str(form, "priority"), PRIORITIES, "MEDIA");
  const periodicity = oneOf(str(form, "periodicity"), PERIODICITIES, "UNICA");
  const { assigneeUserId, assigneeTeamId } = parseAssignee(str(form, "assignee"));

  if (title.length < 3) return "Informe um título para a tarefa.";
  if (!locationId) return "Selecione o local.";
  if (!type) return "Selecione o tipo de manutenção.";
  if (!assigneeUserId && !assigneeTeamId) return "Selecione o responsável (jardineiro ou equipe).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Informe a data da tarefa.";

  const scheduledAt = fromLocal(date, time);
  const dueAt = fromLocal(dueDate, dueTime);
  if (dueAt < scheduledAt) return "O prazo não pode ser anterior à data de início.";

  const intervalDays = num(form, "intervalDays");
  if (periodicity === "PERSONALIZADA" && (!intervalDays || intervalDays < 1)) return "Informe o intervalo em dias da periodicidade personalizada.";
  const recurrenceEndStr = str(form, "recurrenceEnd");

  let checklist: ParsedTaskForm["checklist"] = [];
  try {
    const raw = JSON.parse(str(form, "checklist") || "[]");
    if (Array.isArray(raw)) {
      checklist = raw
        .map((i) => ({ id: typeof i?.id === "string" ? i.id : undefined, text: String(i?.text ?? "").trim(), required: Boolean(i?.required) }))
        .filter((i) => i.text);
    }
  } catch {
    return "Checklist inválido.";
  }

  return {
    title,
    description: optStr(form, "description"),
    instructions: optStr(form, "instructions"),
    locationId,
    assigneeUserId,
    assigneeTeamId,
    scheduledAt,
    dueAt,
    type,
    priority: priority ?? "MEDIA",
    periodicity: periodicity ?? "UNICA",
    intervalDays: intervalDays ? Math.round(intervalDays) : null,
    recurrenceEnd: recurrenceEndStr ? fromLocal(recurrenceEndStr, "23:59") : null,
    scheduleId: optStr(form, "scheduleId"),
    checklist,
  };
}

/** Criação de tarefa: cadastro, Ronda de Jardinagem, QR Code e conversão de ocorrência. */
export async function createTask(form: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await leaderOrFail();
  if (!user) return fail("Apenas a liderança pode criar tarefas.");

  const parsed = parseTaskForm(form);
  if (typeof parsed === "string") return fail(parsed);
  const origin = oneOf(str(form, "origin"), TASK_ORIGINS, "MANUAL") ?? "MANUAL";
  const occurrenceId = optStr(form, "occurrenceId");

  const location = await db.location.findUnique({ where: { id: parsed.locationId } });
  if (!location) return fail("Local não encontrado.");

  const occurrence = occurrenceId
    ? await db.occurrence.findUnique({ where: { id: occurrenceId }, include: { photos: true } })
    : null;
  if (occurrenceId && (!occurrence || occurrence.status !== "ABERTA")) return fail("A ocorrência não está mais aberta.");

  try {
    const saved = await saveImages(imagesFrom(form, "photos"));

    const result = await db.$transaction(async (tx) => {
      let recurrenceId: string | null = null;
      if (parsed.periodicity !== "UNICA") {
        const rec = await tx.recurringMaintenance.create({
          data: {
            title: parsed.title,
            instructions: parsed.instructions,
            type: parsed.type,
            priority: parsed.priority,
            locationId: location.id,
            areaId: location.areaId,
            assigneeUserId: parsed.assigneeUserId,
            assigneeTeamId: parsed.assigneeTeamId,
            scheduleId: parsed.scheduleId,
            frequency: parsed.periodicity,
            intervalDays: parsed.intervalDays,
            startDate: parsed.scheduledAt,
            endDate: parsed.recurrenceEnd,
            timeOfDay: timeKey(parsed.scheduledAt),
            durationHours: Math.max(1, Math.ceil((parsed.dueAt.getTime() - parsed.scheduledAt.getTime()) / 3600000)),
            checklistJson: JSON.stringify(parsed.checklist.map(({ text, required }) => ({ text, required }))),
            lastGeneratedDate: parsed.scheduledAt,
            createdById: user.id,
          },
        });
        recurrenceId = rec.id;
        await audit({ entityType: "RECURRENCE", entityId: rec.id, action: "CRIADA", summary: `Manutenção recorrente criada (${labelOf(PERIODICITIES, parsed.periodicity)})`, userId: user.id, locationId: location.id }, tx);
      }

      const number = await nextTaskNumber(tx);
      const task = await tx.task.create({
        data: {
          number,
          title: parsed.title,
          description: parsed.description,
          instructions: parsed.instructions,
          type: parsed.type,
          priority: parsed.priority,
          status: statusForSchedule(parsed.scheduledAt, parsed.dueAt),
          periodicity: parsed.periodicity,
          origin,
          locationId: location.id,
          areaId: location.areaId,
          assigneeUserId: parsed.assigneeUserId,
          assigneeTeamId: parsed.assigneeTeamId,
          scheduleId: parsed.scheduleId,
          recurrenceId,
          scheduledAt: parsed.scheduledAt,
          dueAt: parsed.dueAt,
          createdById: user.id,
          checklist: { create: parsed.checklist.map((c, idx) => ({ text: c.text, required: c.required, order: idx })) },
        },
      });

      for (const s of saved) {
        await tx.photo.create({ data: { ...s, stage: "ANTES", taskId: task.id, locationId: location.id, uploadedById: user.id } });
      }

      if (occurrence) {
        await tx.occurrence.update({ where: { id: occurrence.id }, data: { status: "CONVERTIDA", convertedTaskId: task.id } });
        for (const p of occurrence.photos) {
          await tx.photo.create({
            data: { fileName: p.fileName, mimeType: p.mimeType, stage: "ANTES", caption: "Foto da ocorrência", taskId: task.id, locationId: p.locationId, uploadedById: p.uploadedById, takenAt: p.takenAt },
          });
        }
        await audit({ entityType: "OCCURRENCE", entityId: occurrence.id, action: "CONVERTIDA", summary: `Ocorrência convertida na tarefa ${taskCode(number)}`, userId: user.id, locationId: location.id, taskId: task.id }, tx);
      }

      await audit(
        {
          entityType: "TASK",
          entityId: task.id,
          action: "CRIADA",
          summary: `Tarefa criada via ${labelOf(TASK_ORIGINS, origin)}`,
          userId: user.id,
          taskId: task.id,
          locationId: location.id,
          details: { prioridade: parsed.priority, prazo: parsed.dueAt, fotos: saved.length, checklist: parsed.checklist.length },
        },
        tx,
      );

      await notifyTaskAssignees(
        task,
        {
          type: "NOVA_TAREFA",
          title: parsed.priority === "URGENTE" ? "Nova tarefa URGENTE" : "Nova tarefa atribuída",
          message: `${parsed.title} · ${location.name}. ${formatDate(parsed.scheduledAt)} · prazo ${formatDateTime(parsed.dueAt)}`,
          link: `/minhas-tarefas/${task.id}`,
          taskId: task.id,
        },
        tx,
        user.id,
      );
      if (origin === "RONDA") {
        await notifyLeaders(
          { type: "NOVA_TAREFA", title: "Nova tarefa da Ronda", message: `${parsed.title} · ${location.name} (por ${user.name})`, link: `/tarefas/${task.id}`, taskId: task.id },
          tx,
          user.id,
        );
      }
      return { id: task.id, recurrenceId };
    });

    if (result.recurrenceId) {
      const rec = await db.recurringMaintenance.findUnique({ where: { id: result.recurrenceId } });
      if (rec) await generateForRecurrence(rec, user.id);
    }

    revalidateTasks();
    return { ok: true, data: { id: result.id }, message: "Tarefa criada." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

const TASK_FIELD_LABELS = {
  title: "Título",
  description: "Problema",
  instructions: "Instruções",
  locationId: "Local",
  assigneeUserId: "Jardineiro",
  assigneeTeamId: "Equipe",
  scheduledAt: "Data programada",
  dueAt: "Prazo",
  type: "Tipo",
  priority: "Prioridade",
  scheduleId: "Cronograma",
};

export async function updateTask(taskId: string, form: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await leaderOrFail();
  if (!user) return fail("Apenas a liderança pode editar tarefas.");

  const task = await db.task.findUnique({ where: { id: taskId }, include: { checklist: true } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") return fail("Tarefas concluídas ou canceladas não podem ser editadas.");

  const parsed = parseTaskForm(form);
  if (typeof parsed === "string") return fail(parsed);
  const location = await db.location.findUnique({ where: { id: parsed.locationId } });
  if (!location) return fail("Local não encontrado.");

  try {
    const saved = await saveImages(imagesFrom(form, "photos"));

    const scheduleChanged = task.scheduledAt.getTime() !== parsed.scheduledAt.getTime() || task.dueAt.getTime() !== parsed.dueAt.getTime();
    const notStarted = NOT_STARTED.includes(task.status as TaskStatus);
    const assigneeChanged = task.assigneeUserId !== parsed.assigneeUserId || task.assigneeTeamId !== parsed.assigneeTeamId;
    const instructionsChanged = (task.instructions ?? "") !== (parsed.instructions ?? "");

    const data = {
      title: parsed.title,
      description: parsed.description,
      instructions: parsed.instructions,
      locationId: location.id,
      areaId: location.areaId,
      assigneeUserId: parsed.assigneeUserId,
      assigneeTeamId: parsed.assigneeTeamId,
      scheduledAt: parsed.scheduledAt,
      dueAt: parsed.dueAt,
      type: parsed.type,
      priority: parsed.priority,
      scheduleId: parsed.scheduleId,
    };
    const changes = diffFields(task, data, TASK_FIELD_LABELS);

    await db.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          ...data,
          updatedById: user.id,
          ...(scheduleChanged ? { dueSoonNotifiedAt: null, lateNotifiedAt: null } : {}),
          ...(scheduleChanged && notStarted ? { status: statusForSchedule(parsed.scheduledAt, parsed.dueAt) } : {}),
        },
      });

      // Checklist: atualiza, cria e remove itens (itens já marcados não são removidos)
      const keepIds = new Set(parsed.checklist.filter((c) => c.id).map((c) => c.id));
      const removable = task.checklist.filter((c) => !keepIds.has(c.id) && !c.done).map((c) => c.id);
      if (removable.length) await tx.taskChecklistItem.deleteMany({ where: { id: { in: removable } } });
      for (const [idx, c] of parsed.checklist.entries()) {
        if (c.id && task.checklist.some((e) => e.id === c.id)) {
          await tx.taskChecklistItem.update({ where: { id: c.id }, data: { text: c.text, required: c.required, order: idx } });
        } else {
          await tx.taskChecklistItem.create({ data: { taskId: task.id, text: c.text, required: c.required, order: idx } });
        }
      }

      for (const s of saved) {
        await tx.photo.create({ data: { ...s, stage: "ANTES", taskId: task.id, locationId: location.id, uploadedById: user.id } });
      }

      await audit(
        {
          entityType: "TASK",
          entityId: task.id,
          action: "ALTERADA",
          summary: changes.length ? `Alterado: ${changes.map((c) => c.field).join(", ")}` : "Tarefa atualizada",
          userId: user.id,
          taskId: task.id,
          locationId: location.id,
          details: { alteracoes: changes, fotosAdicionadas: saved.length },
        },
        tx,
      );

      const updated = { assigneeUserId: parsed.assigneeUserId, assigneeTeamId: parsed.assigneeTeamId };
      if (assigneeChanged) {
        await notifyTaskAssignees(updated, { type: "NOVA_TAREFA", title: "Nova tarefa atribuída", message: `${parsed.title} · ${location.name}`, link: `/minhas-tarefas/${task.id}`, taskId: task.id }, tx, user.id);
      } else if (instructionsChanged || saved.length) {
        await notifyTaskAssignees(updated, { type: "INSTRUCOES", title: "A liderança enviou instruções/fotos", message: `${parsed.title} · ${location.name}`, link: `/minhas-tarefas/${task.id}`, taskId: task.id }, tx, user.id);
      } else if (scheduleChanged) {
        await notifyTaskAssignees(updated, { type: "MANUTENCAO_PROGRAMADA", title: "Tarefa reprogramada", message: `${parsed.title}: ${formatDate(parsed.scheduledAt)} · prazo ${formatDateTime(parsed.dueAt)}`, link: `/minhas-tarefas/${task.id}`, taskId: task.id }, tx, user.id);
      }
    });

    revalidateTasks();
    return { ok: true, data: { id: task.id }, message: "Tarefa atualizada." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

/** Arrastar no cronograma: move a tarefa para outra data mantendo horário e duração do prazo. */
export async function rescheduleTask(taskId: string, newDate: string): Promise<ActionResult> {
  const user = await leaderOrFail();
  if (!user) return fail("Apenas a liderança pode reorganizar o cronograma.");
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } } } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  if (!["PROGRAMADA", "PENDENTE", "ATRASADA"].includes(task.status)) return fail("Somente tarefas não iniciadas podem ser movidas.");
  if (dateKey(task.scheduledAt) === newDate) return { ok: true };

  const scheduledAt = fromLocal(newDate, timeKey(task.scheduledAt));
  const delta = scheduledAt.getTime() - task.scheduledAt.getTime();
  const dueAt = new Date(task.dueAt.getTime() + delta);

  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: task.id },
      data: { scheduledAt, dueAt, status: statusForSchedule(scheduledAt, dueAt), updatedById: user.id, dueSoonNotifiedAt: null, lateNotifiedAt: null },
    });
    await audit({ entityType: "TASK", entityId: task.id, action: "REPROGRAMADA", summary: `Reprogramada de ${formatDate(task.scheduledAt)} para ${formatDate(scheduledAt)}`, userId: user.id, taskId: task.id, locationId: task.locationId }, tx);
    await notifyTaskAssignees(task, { type: "MANUTENCAO_PROGRAMADA", title: "Tarefa reprogramada", message: `${task.title} · ${task.location.name}: agora em ${formatDate(scheduledAt)}`, link: `/minhas-tarefas/${task.id}`, taskId: task.id }, tx, user.id);
  });
  revalidateTasks();
  return { ok: true };
}

export async function cancelTask(taskId: string, reason: string): Promise<ActionResult> {
  const user = await leaderOrFail();
  if (!user) return fail("Apenas a liderança pode cancelar tarefas.");
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } } } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") return fail("Esta tarefa não pode ser cancelada.");
  if (!reason.trim()) return fail("Informe o motivo do cancelamento.");

  await db.$transaction(async (tx) => {
    await tx.timeLog.updateMany({ where: { taskId, endedAt: null }, data: { endedAt: new Date() } });
    await tx.task.update({ where: { id: taskId }, data: { status: "CANCELADA", cancelReason: reason.trim(), updatedById: user.id } });
    await audit({ entityType: "TASK", entityId: taskId, action: "CANCELADA", summary: `Cancelada: ${reason.trim()}`, userId: user.id, taskId, locationId: task.locationId }, tx);
    await notifyTaskAssignees(task, { type: "INSTRUCOES", title: "Tarefa cancelada", message: `${task.title} · ${task.location.name}. Motivo: ${reason.trim()}`, link: `/minhas-tarefas/${taskId}`, taskId }, tx, user.id);
  });
  revalidateTasks();
  return { ok: true, message: "Tarefa cancelada." };
}

/**
 * Exclusão de tarefas.
 * - Não concluídas: liderança pode excluir (exclusão lógica, mantendo rastreabilidade).
 * - Concluídas: exclusão definitiva somente por Administrador, com senha e justificativa.
 */
export async function deleteTask(taskId: string, reason: string, adminPassword?: string): Promise<ActionResult> {
  const user = await leaderOrFail();
  if (!user) return fail("Apenas a liderança pode excluir tarefas.");
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } }, _count: { select: { photos: true } } } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  if (!reason.trim()) return fail("Informe o motivo da exclusão.");

  if (task.status === "CONCLUIDA") {
    if (!isAdmin(user)) return fail("Manutenções concluídas só podem ser excluídas com autorização de um Administrador.");
    const admin = await db.user.findUnique({ where: { id: user.id } });
    if (!admin || !adminPassword || !bcrypt.compareSync(adminPassword, admin.passwordHash)) return fail("Senha do administrador incorreta.");

    await db.$transaction(async (tx) => {
      await audit(
        {
          entityType: "TASK",
          entityId: task.id,
          action: "EXCLUIDA_DEFINITIVAMENTE",
          summary: `${taskCode(task.number)} "${task.title}" (concluída) excluída definitivamente com autorização administrativa. Motivo: ${reason.trim()}`,
          userId: user.id,
          locationId: task.locationId,
          details: { tarefa: { numero: task.number, titulo: task.title, local: task.location.name, concluidaEm: task.approvedAt, fotos: task._count.photos } },
        },
        tx,
      );
      await tx.occurrence.updateMany({ where: { convertedTaskId: task.id }, data: { convertedTaskId: null } });
      await tx.task.delete({ where: { id: task.id } });
    });
    revalidateTasks();
    return { ok: true, message: "Manutenção concluída excluída definitivamente." };
  }

  await db.$transaction(async (tx) => {
    await tx.task.update({ where: { id: task.id }, data: { deletedAt: new Date(), deletedById: user.id, deleteReason: reason.trim() } });
    await audit({ entityType: "TASK", entityId: task.id, action: "EXCLUIDA", summary: `Tarefa excluída. Motivo: ${reason.trim()}`, userId: user.id, taskId: task.id, locationId: task.locationId }, tx);
    await notifyTaskAssignees(task, { type: "INSTRUCOES", title: "Tarefa removida", message: `${task.title} · ${task.location.name} foi removida pela liderança.`, taskId: task.id }, tx, user.id);
  });
  revalidateTasks();
  return { ok: true, message: "Tarefa excluída." };
}

/** Liderança envia fotos de referência ("antes") para uma tarefa existente. */
export async function addReferencePhotos(taskId: string, form: FormData): Promise<ActionResult> {
  const user = await leaderOrFail();
  if (!user) return fail("Apenas a liderança pode enviar fotos de referência.");
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } } } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  const files = imagesFrom(form, "photos");
  if (!files.length) return fail("Selecione ao menos uma foto.");
  try {
    for (const f of files) {
      const s = await saveImage(f);
      await db.photo.create({ data: { ...s, stage: "ANTES", taskId, locationId: task.locationId, uploadedById: user.id } });
    }
    await audit({ entityType: "TASK", entityId: taskId, action: "FOTOS_REFERENCIA", summary: `${plural(files.length, "foto de referência adicionada", "fotos de referência adicionadas")}`, userId: user.id, taskId, locationId: task.locationId });
    await notifyTaskAssignees(task, { type: "INSTRUCOES", title: "Novas fotos da liderança", message: `${task.title} · ${task.location.name}`, link: `/minhas-tarefas/${taskId}`, taskId }, db, user.id);
    revalidateTasks();
    return { ok: true, message: "Fotos enviadas." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}
