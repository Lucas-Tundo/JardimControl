import { db } from "./db";
import { endOfDay, formatDateTime } from "./dates";
import { leaderIds, notifyUsers, taskRecipientIds } from "./notify";
import { generateAllRecurrences } from "./recurrence";
import { taskCode } from "./tasks";

const INTERVAL_MS = 60_000;
const DUE_SOON_MS = 24 * 60 * 60 * 1000;
const g = globalThis as unknown as { __jcSweepAt?: number; __jcSweepRunning?: Promise<void> };

/**
 * Rotina automática executada no máximo 1x por minuto durante o uso do sistema:
 * gera recorrências, atualiza status (Programada, depois Pendente, depois Atrasada) e
 * dispara notificações de prazo próximo e atraso.
 */
export async function runSweep(force = false): Promise<void> {
  const now = Date.now();
  if (!force && g.__jcSweepAt && now - g.__jcSweepAt < INTERVAL_MS) return;
  if (g.__jcSweepRunning) return g.__jcSweepRunning;
  g.__jcSweepAt = now;
  g.__jcSweepRunning = (async () => {
    try {
      await generateAllRecurrences();
      await updateStatuses();
    } catch (err) {
      console.error("[sweep]", err);
    } finally {
      g.__jcSweepRunning = undefined;
    }
  })();
  return g.__jcSweepRunning;
}

async function updateStatuses() {
  const now = new Date();

  await db.task.updateMany({
    where: { deletedAt: null, status: "PROGRAMADA", scheduledAt: { lte: endOfDay(now) }, dueAt: { gte: now } },
    data: { status: "PENDENTE" },
  });

  const leaders = await leaderIds();

  // Tarefas que passaram do prazo
  const late = await db.task.findMany({
    where: {
      deletedAt: null,
      lateNotifiedAt: null,
      dueAt: { lt: now },
      status: { in: ["PROGRAMADA", "PENDENTE", "ATRASADA", "EM_ANDAMENTO"] },
    },
    include: { location: { select: { name: true } } },
  });
  for (const t of late) {
    await db.task.update({
      where: { id: t.id },
      data: { lateNotifiedAt: now, ...(t.status === "EM_ANDAMENTO" ? {} : { status: "ATRASADA" }) },
    });
    const recipients = await taskRecipientIds(t);
    const msg = `${taskCode(t.number)} · ${t.title} · ${t.location.name}. Prazo: ${formatDateTime(t.dueAt)}`;
    await notifyUsers(recipients, { type: "ATRASADA", title: "Tarefa atrasada", message: msg, link: `/minhas-tarefas/${t.id}`, taskId: t.id });
    await notifyUsers(leaders, { type: "ATRASADA", title: "Tarefa atrasada", message: msg, link: `/tarefas/${t.id}`, taskId: t.id });
  }

  // Prazo próximo (menos de 24h)
  const soon = await db.task.findMany({
    where: {
      deletedAt: null,
      dueSoonNotifiedAt: null,
      dueAt: { gte: now, lte: new Date(now.getTime() + DUE_SOON_MS) },
      status: { in: ["PROGRAMADA", "PENDENTE", "EM_ANDAMENTO"] },
    },
    include: { location: { select: { name: true } } },
  });
  for (const t of soon) {
    await db.task.update({ where: { id: t.id }, data: { dueSoonNotifiedAt: now } });
    await notifyUsers(await taskRecipientIds(t), {
      type: "PRAZO_PROXIMO",
      title: "Prazo próximo",
      message: `${t.title} · ${t.location.name}. Prazo: ${formatDateTime(t.dueAt)}`,
      link: `/minhas-tarefas/${t.id}`,
      taskId: t.id,
    });
  }
}
