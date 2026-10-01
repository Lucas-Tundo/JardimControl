import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { fromLocal } from "./dates";
import { photoUrl } from "./files";
import { lateWhere, taskCode } from "./tasks";
import type { PhotoView } from "@/components/photos";

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Converte os filtros da URL (data, responsável, equipe, área, tipo, status, prioridade) em filtro Prisma. */
export function buildTaskWhere(sp: SearchParams): Prisma.TaskWhereInput {
  const and: Prisma.TaskWhereInput[] = [{ deletedAt: null }];
  const from = param(sp, "de");
  const to = param(sp, "ate");
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) and.push({ scheduledAt: { gte: fromLocal(from) } });
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) and.push({ scheduledAt: { lte: fromLocal(to, "23:59") } });

  const resp = param(sp, "responsavel");
  if (resp) and.push({ assigneeUserId: resp });
  const team = param(sp, "equipe");
  if (team) and.push({ assigneeTeamId: team });
  const area = param(sp, "area");
  if (area) and.push({ areaId: area });
  const local = param(sp, "local");
  if (local) and.push({ locationId: local });
  const type = param(sp, "tipo");
  if (type) and.push({ type });
  const priority = param(sp, "prioridade");
  if (priority) and.push({ priority });
  const status = param(sp, "status");
  if (status === "ATRASADA") and.push(lateWhere());
  else if (status === "ABERTAS") and.push({ status: { notIn: ["CONCLUIDA", "CANCELADA"] } });
  else if (status) and.push({ status });
  const q = param(sp, "q");
  if (q) {
    const n = Number(q.replace(/\D/g, ""));
    and.push({ OR: [{ title: { contains: q } }, { location: { name: { contains: q } } }, ...(n ? [{ number: n }] : [])] });
  }
  return { AND: and };
}

export async function getFormOptions() {
  const [locations, users, teams, schedules, templates, areas] = await Promise.all([
    db.location.findMany({ where: { active: true }, include: { area: { select: { name: true } } }, orderBy: [{ area: { name: "asc" } }, { name: "asc" }] }),
    db.user.findMany({ where: { active: true, role: "JARDINEIRO" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.team.findMany({ where: { active: true }, select: { id: true, name: true, _count: { select: { members: true } } }, orderBy: { name: "asc" } }),
    db.schedule.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    db.checklistTemplate.findMany({ include: { items: { orderBy: { order: "asc" } } }, orderBy: { name: "asc" } }),
    db.area.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    locations: locations.map((l) => ({ id: l.id, name: l.name, code: l.code, area: l.area.name, areaId: l.areaId, latitude: l.latitude, longitude: l.longitude })),
    users,
    teams: teams.map((t) => ({ id: t.id, name: t.name, members: t._count.members })),
    schedules,
    templates: templates.map((t) => ({ id: t.id, name: t.name, type: t.type, items: t.items.map((i) => ({ text: i.text, required: i.required })) })),
    areas,
  };
}
export type FormOptions = Awaited<ReturnType<typeof getFormOptions>>;

export const photoInclude = {
  uploadedBy: { select: { name: true } },
  location: { select: { name: true } },
  task: { select: { number: true, title: true } },
} satisfies Prisma.PhotoInclude;

export type PhotoWithRefs = Prisma.PhotoGetPayload<{ include: typeof photoInclude }>;

export function toPhotoView(p: PhotoWithRefs): PhotoView {
  return {
    id: p.id,
    url: photoUrl(p.fileName),
    stage: p.stage,
    takenAt: p.takenAt,
    uploadedBy: p.uploadedBy.name,
    location: p.location.name,
    task: p.task ? `${taskCode(p.task.number)} · ${p.task.title}` : null,
    caption: p.caption,
  };
}
