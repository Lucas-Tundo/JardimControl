import type { Prisma } from "@prisma/client";
import { MAINTENANCE_TYPES, PRIORITIES, TASK_STATUS, labelOf, type TaskStatus } from "./constants";
import { formatDate, fromLocal } from "./dates";
import { db } from "./db";
import { buildTaskWhere, param, type SearchParams } from "./queries";
import { isLate } from "./tasks";

export type ReportGroupRow = { key: string; label: string; total: number; done: number; open: number; late: number; minutes: number; avgMinutes: number };

const reportTaskInclude = {
  location: { select: { name: true, code: true } },
  area: { select: { id: true, name: true } },
  assigneeUser: { select: { id: true, name: true } },
  assigneeTeam: { select: { id: true, name: true } },
  approvedBy: { select: { name: true } },
  createdBy: { select: { name: true } },
} satisfies Prisma.TaskInclude;

export type ReportTask = Prisma.TaskGetPayload<{ include: typeof reportTaskInclude }>;

function group(tasks: ReportTask[], keyOf: (t: ReportTask) => [string, string], now: Date): ReportGroupRow[] {
  const map = new Map<string, ReportGroupRow & { timed: number }>();
  for (const t of tasks) {
    const [key, label] = keyOf(t);
    const row = map.get(key) ?? { key, label, total: 0, done: 0, open: 0, late: 0, minutes: 0, avgMinutes: 0, timed: 0 };
    row.total++;
    if (t.status === "CONCLUIDA") {
      row.done++;
      if (t.totalMinutes > 0) {
        row.minutes += t.totalMinutes;
        row.timed++;
      }
    } else if (t.status !== "CANCELADA") row.open++;
    if (isLate(t, now)) row.late++;
    map.set(key, row);
  }
  return [...map.values()]
    .map(({ timed, ...r }) => ({ ...r, avgMinutes: timed ? Math.round(r.minutes / timed) : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Descrição legível dos filtros aplicados (cabeçalho do relatório e registro). */
async function describeFilters(sp: SearchParams): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const de = param(sp, "de");
  const ate = param(sp, "ate");
  out["Período"] = `${de ? formatDate(fromLocal(de)) : "início"} a ${ate ? formatDate(fromLocal(ate)) : "hoje"}`;
  const [user, team, area, loc] = await Promise.all([
    param(sp, "responsavel") ? db.user.findUnique({ where: { id: param(sp, "responsavel") }, select: { name: true } }) : null,
    param(sp, "equipe") ? db.team.findUnique({ where: { id: param(sp, "equipe") }, select: { name: true } }) : null,
    param(sp, "area") ? db.area.findUnique({ where: { id: param(sp, "area") }, select: { name: true } }) : null,
    param(sp, "local") ? db.location.findUnique({ where: { id: param(sp, "local") }, select: { name: true } }) : null,
  ]);
  if (user) out["Jardineiro"] = user.name;
  if (team) out["Equipe"] = team.name;
  if (area) out["Área"] = area.name;
  if (loc) out["Local"] = loc.name;
  if (param(sp, "tipo")) out["Tipo"] = labelOf(MAINTENANCE_TYPES, param(sp, "tipo"));
  if (param(sp, "status")) out["Status"] = param(sp, "status") === "ABERTAS" ? "Abertas" : labelOf(TASK_STATUS, param(sp, "status"));
  if (param(sp, "prioridade")) out["Prioridade"] = labelOf(PRIORITIES, param(sp, "prioridade"));
  return out;
}

export async function computeReport(sp: SearchParams) {
  const now = new Date();
  const where = buildTaskWhere(sp);
  const de = param(sp, "de");
  const ate = param(sp, "ate");
  const occWhere: Prisma.OccurrenceWhereInput = {
    ...(de || ate ? { createdAt: { ...(de ? { gte: fromLocal(de) } : {}), ...(ate ? { lte: fromLocal(ate, "23:59") } : {}) } } : {}),
    ...(param(sp, "local") ? { locationId: param(sp, "local") } : {}),
    ...(param(sp, "area") ? { location: { areaId: param(sp, "area") } } : {}),
  };

  const [tasks, occurrences, filters] = await Promise.all([
    db.task.findMany({ where, include: reportTaskInclude, orderBy: { scheduledAt: "asc" } }),
    db.occurrence.findMany({ where: occWhere, include: { location: { select: { name: true } }, reportedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    describeFilters(sp),
  ]);

  const count = (s: TaskStatus) => tasks.filter((t) => t.status === s).length;
  const done = tasks.filter((t) => t.status === "CONCLUIDA");
  const timed = done.filter((t) => t.totalMinutes > 0);
  const totalMinutes = timed.reduce((s, t) => s + t.totalMinutes, 0);
  const active = tasks.filter((t) => t.status !== "CANCELADA").length;

  const indicators = {
    total: tasks.length,
    concluidas: done.length,
    pendentes: count("PENDENTE") + count("PROGRAMADA"),
    emAndamento: count("EM_ANDAMENTO"),
    aguardando: count("AGUARDANDO_APROVACAO"),
    atrasadas: tasks.filter((t) => isLate(t, now)).length,
    canceladas: count("CANCELADA"),
    taxaConclusao: active ? Math.round((done.length / active) * 100) : 0,
    tempoMedio: timed.length ? Math.round(totalMinutes / timed.length) : 0,
    tempoTotal: totalMinutes,
    ocorrencias: occurrences.length,
    ocorrenciasAbertas: occurrences.filter((o) => o.status === "ABERTA").length,
    devolucoes: tasks.reduce((s, t) => s + t.returnCount, 0),
  };

  return {
    generatedAt: now,
    filters,
    indicators,
    tasks,
    occurrences,
    byArea: group(tasks, (t) => [t.area.id, t.area.name], now),
    byAssignee: group(tasks, (t) => (t.assigneeUser ? [t.assigneeUser.id, t.assigneeUser.name] : t.assigneeTeam ? [t.assigneeTeam.id, `Equipe: ${t.assigneeTeam.name}`] : ["-", "Sem responsável"]), now),
    byType: group(tasks, (t) => [t.type, labelOf(MAINTENANCE_TYPES, t.type)], now),
    byStatus: Object.entries(TASK_STATUS).map(([k, v]) => ({ key: k, label: v.label, hex: v.hex, count: tasks.filter((t) => t.status === k).length })),
    byPriority: Object.entries(PRIORITIES).map(([k, v]) => ({ key: k, label: v.label, count: tasks.filter((t) => t.priority === k).length })),
  };
}

export type ReportData = Awaited<ReturnType<typeof computeReport>>;
