"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canAccessTask, getCurrentUser, isLeader } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyLeaders, notifyTaskAssignees } from "@/lib/notify";
import { imagesFrom, saveImage } from "@/lib/files";
import { formatDuration, formatTime, minutesBetween } from "@/lib/dates";
import { statusForSchedule, taskCode } from "@/lib/tasks";
import { errorMessage, fail, type ActionResult } from "@/lib/action-utils";
import { plural } from "@/lib/text";

async function loadTaskForExecution(taskId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." } as const;
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } } } });
  if (!task || task.deletedAt) return { error: "Tarefa não encontrada." } as const;
  if (!canAccessTask(user, task)) return { error: "Esta tarefa não está atribuída a você." } as const;
  return { user, task } as const;
}

function revalidate() {
  revalidatePath("/", "layout");
}

/** INICIAR TAREFA · registra automaticamente data e horário de início. */
export async function startTask(taskId: string): Promise<ActionResult> {
  const r = await loadTaskForExecution(taskId);
  if ("error" in r) return fail(r.error!);
  const { user, task } = r;
  if (!["PROGRAMADA", "PENDENTE", "ATRASADA"].includes(task.status)) {
    if (task.status === "EM_ANDAMENTO") return { ok: true };
    return fail("Esta tarefa não pode ser iniciada no status atual.");
  }
  const now = new Date();
  const resuming = task.returnCount > 0 && !!task.startedAt;
  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: task.id },
      data: { status: "EM_ANDAMENTO", startedAt: task.startedAt ?? now, updatedById: user.id },
    });
    await tx.timeLog.create({ data: { taskId: task.id, userId: user.id, startedAt: now } });
    await audit(
      {
        entityType: "TASK",
        entityId: task.id,
        action: resuming ? "RETOMADA" : "INICIADA",
        summary: `${resuming ? "Correção iniciada" : "Execução iniciada"} às ${formatTime(now)} por ${user.name}`,
        userId: user.id,
        taskId: task.id,
        locationId: task.locationId,
      },
      tx,
    );
  });
  revalidate();
  return { ok: true, message: `Tarefa iniciada às ${formatTime(now)}.` };
}

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<ActionResult> {
  const item = await db.taskChecklistItem.findUnique({ where: { id: itemId } });
  if (!item) return fail("Item não encontrado.");
  const r = await loadTaskForExecution(item.taskId);
  if ("error" in r) return fail(r.error!);
  if (r.task.status !== "EM_ANDAMENTO") return fail("Inicie a tarefa para preencher o checklist.");
  await db.taskChecklistItem.update({
    where: { id: itemId },
    data: done ? { done: true, doneAt: new Date(), doneById: r.user.id } : { done: false, doneAt: null, doneById: null },
  });
  revalidate();
  return { ok: true };
}

export async function saveExecutionNotes(taskId: string, notes: string): Promise<ActionResult> {
  const r = await loadTaskForExecution(taskId);
  if ("error" in r) return fail(r.error!);
  if (!["EM_ANDAMENTO", "PENDENTE", "ATRASADA", "PROGRAMADA"].includes(r.task.status)) return fail("Não é possível alterar as observações agora.");
  const value = notes.trim();
  if (value === (r.task.executionNotes ?? "")) return { ok: true };
  await db.task.update({ where: { id: taskId }, data: { executionNotes: value || null, updatedById: r.user.id } });
  await audit({ entityType: "TASK", entityId: taskId, action: "OBSERVACAO", summary: "Observações da execução atualizadas", userId: r.user.id, taskId, locationId: r.task.locationId, details: { observacoes: value } });
  revalidate();
  return { ok: true, message: "Observações salvas." };
}

/** Fotos do jardineiro: DURANTE (opcionais) e DEPOIS (obrigatórias). */
export async function uploadExecutionPhotos(taskId: string, stage: "DURANTE" | "DEPOIS", form: FormData): Promise<ActionResult> {
  const r = await loadTaskForExecution(taskId);
  if ("error" in r) return fail(r.error!);
  if (r.task.status !== "EM_ANDAMENTO") return fail("Inicie a tarefa para registrar fotos.");
  if (stage !== "DURANTE" && stage !== "DEPOIS") return fail("Etapa inválida.");
  const files = imagesFrom(form, "photos");
  if (!files.length) return fail("Nenhuma foto selecionada.");
  try {
    for (const f of files) {
      const s = await saveImage(f);
      await db.photo.create({ data: { ...s, stage, taskId, locationId: r.task.locationId, uploadedById: r.user.id } });
    }
    await audit({ entityType: "TASK", entityId: taskId, action: "FOTO", summary: `${plural(files.length, "foto registrada", "fotos registradas")} (${stage === "DEPOIS" ? "depois" : "durante"})`, userId: r.user.id, taskId, locationId: r.task.locationId });
    revalidate();
    return { ok: true, message: "Foto registrada." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sessão expirada.");
  const photo = await db.photo.findUnique({ where: { id: photoId }, include: { task: true } });
  if (!photo) return fail("Foto não encontrada.");
  const leader = isLeader(user);
  if (photo.task?.status === "CONCLUIDA") return fail("Fotos de manutenções concluídas não podem ser removidas.");
  if (photo.stage === "DURANTE" || photo.stage === "DEPOIS") {
    if (photo.uploadedById !== user.id && !leader) return fail("Você só pode remover suas próprias fotos.");
    if (!leader && photo.task?.status !== "EM_ANDAMENTO") return fail("A foto já foi enviada para aprovação.");
  } else if (!leader) {
    return fail("Apenas a liderança pode remover esta foto.");
  }
  await db.photo.delete({ where: { id: photoId } });
  await audit({ entityType: photo.taskId ? "TASK" : "LOCATION", entityId: photo.taskId ?? photo.locationId, action: "FOTO_REMOVIDA", summary: `Foto (${photo.stage.toLowerCase()}) removida`, userId: user.id, taskId: photo.taskId, locationId: photo.locationId, details: { arquivo: photo.fileName } });
  revalidate();
  return { ok: true };
}

/** Finaliza a execução e envia para aprovação (exige checklist obrigatório e fotos finais). */
export async function submitForApproval(taskId: string, notes?: string): Promise<ActionResult> {
  const r = await loadTaskForExecution(taskId);
  if ("error" in r) return fail(r.error!);
  const { user, task } = r;
  if (task.status !== "EM_ANDAMENTO") return fail("A tarefa precisa estar em andamento para ser finalizada.");

  const [pendingRequired, afterPhotos] = await Promise.all([
    db.taskChecklistItem.count({ where: { taskId, required: true, done: false } }),
    db.photo.count({ where: { taskId, stage: "DEPOIS" } }),
  ]);
  if (pendingRequired > 0) return fail(pendingRequired === 1 ? "Ainda há 1 item obrigatório do checklist pendente." : `Ainda há ${pendingRequired} itens obrigatórios do checklist pendentes.`);
  if (afterPhotos === 0) return fail("Tire ao menos uma foto do serviço finalizado (DEPOIS).");

  const now = new Date();
  await db.$transaction(async (tx) => {
    const open = await tx.timeLog.findMany({ where: { taskId, endedAt: null } });
    for (const log of open) {
      await tx.timeLog.update({ where: { id: log.id }, data: { endedAt: now, minutes: minutesBetween(log.startedAt, now) } });
    }
    const agg = await tx.timeLog.aggregate({ where: { taskId }, _sum: { minutes: true } });
    const total = agg._sum.minutes ?? 0;
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: "AGUARDANDO_APROVACAO",
        finishedAt: now,
        submittedAt: now,
        totalMinutes: total,
        updatedById: user.id,
        ...(notes !== undefined ? { executionNotes: notes.trim() || null } : {}),
      },
    });
    await audit(
      {
        entityType: "TASK",
        entityId: taskId,
        action: "ENVIADA_APROVACAO",
        summary: `Execução finalizada às ${formatTime(now)} (tempo total ${formatDuration(total)}) e enviada para aprovação`,
        userId: user.id,
        taskId,
        locationId: task.locationId,
      },
      tx,
    );
    await notifyLeaders(
      {
        type: "AGUARDANDO_APROVACAO",
        title: "Serviço aguardando aprovação",
        message: `${taskCode(task.number)} · ${task.title} · ${task.location.name} (${user.name})`,
        link: `/tarefas/${taskId}`,
        taskId,
      },
      tx,
      user.id,
    );
  });
  revalidate();
  return { ok: true, message: "Enviado para aprovação da liderança." };
}

export async function approveTask(taskId: string, comment: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isLeader(user)) return fail("Apenas a liderança pode aprovar tarefas.");
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } } } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  if (task.status !== "AGUARDANDO_APROVACAO") return fail("A tarefa não está aguardando aprovação.");

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.task.update({ where: { id: taskId }, data: { status: "CONCLUIDA", approvedAt: now, approvedById: user.id, updatedById: user.id } });
    await tx.approval.create({ data: { taskId, reviewerId: user.id, decision: "APROVADA", comment: comment.trim() || null } });
    await audit({ entityType: "TASK", entityId: taskId, action: "APROVADA", summary: `Aprovada e concluída por ${user.name}${comment.trim() ? `: ${comment.trim()}` : ""}`, userId: user.id, taskId, locationId: task.locationId }, tx);
    const msg = { type: "CONCLUIDA" as const, title: "Tarefa aprovada e concluída ", message: `${task.title} · ${task.location.name}`, taskId };
    await notifyTaskAssignees(task, { ...msg, link: `/minhas-tarefas/${taskId}` }, tx, user.id);
    await notifyLeaders({ ...msg, title: "Tarefa concluída", link: `/tarefas/${taskId}` }, tx, user.id);
  });
  revalidate();
  return { ok: true, message: "Tarefa aprovada e concluída." };
}

export async function returnTask(taskId: string, reason: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isLeader(user)) return fail("Apenas a liderança pode devolver tarefas.");
  if (!reason.trim()) return fail("Descreva o que precisa ser corrigido.");
  const task = await db.task.findUnique({ where: { id: taskId }, include: { location: { select: { name: true } } } });
  if (!task || task.deletedAt) return fail("Tarefa não encontrada.");
  if (task.status !== "AGUARDANDO_APROVACAO") return fail("A tarefa não está aguardando aprovação.");

  const status = statusForSchedule(new Date(0), task.dueAt) === "ATRASADA" ? "ATRASADA" : "PENDENTE";
  await db.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status, returnCount: { increment: 1 }, lastReturnReason: reason.trim(), submittedAt: null, updatedById: user.id },
    });
    await tx.approval.create({ data: { taskId, reviewerId: user.id, decision: "DEVOLVIDA", comment: reason.trim() } });
    await audit({ entityType: "TASK", entityId: taskId, action: "DEVOLVIDA", summary: `Devolvida para correção por ${user.name}: ${reason.trim()}`, userId: user.id, taskId, locationId: task.locationId }, tx);
    await notifyTaskAssignees(task, { type: "DEVOLVIDA", title: "Tarefa devolvida para correção", message: `${task.title} · ${reason.trim()}`, link: `/minhas-tarefas/${taskId}`, taskId }, tx, user.id);
  });
  revalidate();
  return { ok: true, message: "Tarefa devolvida para correção." };
}
