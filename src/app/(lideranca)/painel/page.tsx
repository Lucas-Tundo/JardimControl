import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, CalendarDays, Camera, CircleAlert, CircleCheck, CircleDot, Clock, Hourglass, Plus, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireLeader } from "@/lib/auth";
import { OPEN_STATUSES } from "@/lib/constants";
import { addDays, endOfDay, endOfMonth, formatDate, formatDateTime, formatWeekday, startOfDay, startOfMonth, startOfWeek } from "@/lib/dates";
import { lateWhere, taskListInclude } from "@/lib/tasks";
import { buildTaskWhere, getFormOptions, param, photoInclude, toPhotoView, type SearchParams } from "@/lib/queries";
import { getMapData } from "@/lib/map-data";
import { AutoRefresh } from "@/components/auto-refresh";
import { FilterBar } from "@/components/filters";
import { PlantMap } from "@/components/plant-map";
import { PhotoGallery } from "@/components/photos";
import { MonthCalendar, TaskTable, WeekOverview } from "@/components/task-views";
import { EmptyState, OccurrenceTypeLabel, PageHeader, PriorityBadge, Section, SectionLink, StatCard, StatusDot } from "@/components/ui";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireLeader();
  const sp = await searchParams;
  const now = new Date();
  const base = buildTaskWhere(sp);
  const hasPeriod = !!(param(sp, "de") || param(sp, "ate"));
  const w = (extra: Prisma.TaskWhereInput): Prisma.TaskWhereInput => ({ AND: [base, extra] });
  const areaId = param(sp, "area");
  const occWhere: Prisma.OccurrenceWhereInput = { status: "ABERTA", ...(areaId ? { location: { areaId } } : {}) };

  const [today, pending, inProgress, done, late, awaiting, openOcc, openTotal, options, list, weekTasks, monthTasks, occurrences, photos, awaitingList, map] = await Promise.all([
    db.task.count({ where: w({ scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) }, status: { not: "CANCELADA" } }) }),
    db.task.count({ where: w({ status: "PENDENTE" }) }),
    db.task.count({ where: w({ status: "EM_ANDAMENTO" }) }),
    db.task.count({ where: w({ status: "CONCLUIDA", ...(hasPeriod ? {} : { approvedAt: { gte: startOfMonth(now) } }) }) }),
    db.task.count({ where: w(lateWhere(now)) }),
    db.task.count({ where: w({ status: "AGUARDANDO_APROVACAO" }) }),
    db.occurrence.count({ where: occWhere }),
    db.task.count({ where: w({ status: { in: OPEN_STATUSES } }) }),
    getFormOptions(),
    db.task.findMany({
      where: w({ status: { notIn: ["CANCELADA", ...(param(sp, "status") ? [] : ["CONCLUIDA"])] } }),
      include: taskListInclude,
      orderBy: [{ dueAt: "asc" }],
      take: 10,
    }),
    db.task.findMany({
      where: w({ scheduledAt: { gte: startOfWeek(now), lt: addDays(startOfWeek(now), 7) }, status: { not: "CANCELADA" } }),
      select: { id: true, title: true, type: true, status: true, scheduledAt: true, location: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    db.task.findMany({
      where: w({ scheduledAt: { gte: startOfWeek(startOfMonth(now)), lte: addDays(endOfMonth(now), 7) }, status: { not: "CANCELADA" } }),
      select: { scheduledAt: true, status: true },
    }),
    db.occurrence.findMany({ where: areaId ? { location: { areaId } } : {}, include: { location: { select: { name: true } }, reportedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.photo.findMany({ where: { stage: { in: ["ANTES", "DURANTE", "DEPOIS", "OCORRENCIA"] } }, include: photoInclude, orderBy: { createdAt: "desc" }, take: 8 }),
    db.task.findMany({ where: w({ status: "AGUARDANDO_APROVACAO" }), include: taskListInclude, orderBy: { submittedAt: "asc" }, take: 5 }),
    getMapData(),
  ]);

  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v]] : []))).toString();
  const ofOpen = (n: number) => (openTotal ? `${n} de ${openTotal} em aberto` : "Sem tarefas em aberto");

  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle={`${formatWeekday(now)}, ${formatDate(now)} · visão consolidada da operação`}
        actions={
          <>
            <Link href="/tarefas/nova" className="btn-secondary">
              <Plus /> Nova tarefa
            </Link>
            <Link href="/ronda" className="btn-primary">
              <Camera /> Ronda
            </Link>
          </>
        }
      />
      <FilterBar fields={["periodo", "responsavel", "equipe", "area", "tipo", "status", "prioridade"]} users={options.users} teams={options.teams} areas={options.areas} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Tarefas de hoje" value={today} icon={CalendarDays} tone="green" hint="Programadas para hoje" href="/cronograma?view=dia" />
        <StatCard label="Pendentes" value={pending} icon={Clock} tone="yellow" hint={ofOpen(pending)} href="/tarefas?status=PENDENTE" />
        <StatCard label="Em andamento" value={inProgress} icon={CircleDot} tone="orange" hint={ofOpen(inProgress)} href="/tarefas?status=EM_ANDAMENTO" />
        <StatCard label="Concluídas" value={done} icon={CircleCheck} tone="green" hint={hasPeriod ? "No período filtrado" : "Aprovadas neste mês"} href="/tarefas?status=CONCLUIDA" />
        <StatCard label="Atrasadas" value={late} icon={TriangleAlert} tone="red" hint={ofOpen(late)} href="/tarefas?status=ATRASADA" />
        <StatCard label="Aguardando aprovação" value={awaiting} icon={Hourglass} tone="purple" hint={awaiting ? "Revise e aprove" : "Nada pendente"} href="/aprovacoes" />
        <StatCard label="Ocorrências abertas" value={openOcc} icon={CircleAlert} tone="stone" hint={openOcc ? "Precisam de destino" : "Nenhuma aberta"} href="/ocorrencias" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Cronograma semanal" className="lg:col-span-2" actions={<SectionLink href="/cronograma">Abrir cronograma</SectionLink>}>
          <WeekOverview tasks={weekTasks} compact />
        </Section>
        <Section title="Calendário">
          <MonthCalendar tasks={monthTasks} />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Tarefas" className="lg:col-span-2" actions={<SectionLink href={`/tarefas?${qs}`}>Ver todas</SectionLink>}>
          <TaskTable tasks={list} empty="Nenhuma tarefa em aberto para os filtros selecionados." />
        </Section>
        <Section title="Aguardando aprovação" actions={awaiting > 0 && <SectionLink href="/aprovacoes">Analisar</SectionLink>}>
          {awaitingList.length === 0 ? (
            <EmptyState icon={BadgeCheck} title="Nada para aprovar agora" />
          ) : (
            <ul className="-mx-2 flex flex-col">
              {awaitingList.map((t) => (
                <li key={t.id}>
                  <Link href={`/tarefas/${t.id}`} className="flex gap-2.5 rounded-[10px] px-2 py-2.5 hover:bg-stone-50">
                    <StatusDot status="AGUARDANDO_APROVACAO" className="mt-1.5" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-stone-900">{t.title}</span>
                      <span className="block truncate text-xs text-stone-500">
                        {t.location.name} · {t.assigneeUser?.name ?? t.assigneeTeam?.name}
                      </span>
                      <span className="block text-xs text-stone-500">Enviada em {formatDateTime(t.submittedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {awaiting > awaitingList.length && (
            <Link href="/aprovacoes" className="btn-ghost mt-2 w-full">
              Ver as outras {awaiting - awaitingList.length}
            </Link>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Planta da empresa" className="lg:col-span-2" actions={<SectionLink href="/mapa">Abrir planta</SectionLink>}>
          <PlantMap areas={map.areas} points={map.points} />
        </Section>
        <Section title="Últimas ocorrências" actions={<SectionLink href="/ocorrencias">Ver todas</SectionLink>}>
          {occurrences.length === 0 ? (
            <EmptyState icon={TriangleAlert} title="Nenhuma ocorrência registrada" />
          ) : (
            <ul className="flex flex-col divide-y divide-stone-100">
              {occurrences.map((o) => (
                <li key={o.id}>
                  <Link href={`/ocorrencias?id=${o.id}`} className="-mx-2 block rounded-[10px] px-2 py-2.5 hover:bg-stone-50">
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-stone-900">
                      <OccurrenceTypeLabel type={o.type} />
                      <PriorityBadge priority={o.priority} />
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-stone-600">{o.description}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {o.location.name} · {o.reportedBy.name} · {formatDateTime(o.createdAt)}
                      {o.status !== "ABERTA" && ` · ${o.status === "CONVERTIDA" ? "convertida" : "resolvida"}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Últimas fotos enviadas" className="mt-4">
        <PhotoGallery photos={photos.map(toPhotoView)} columns="grid-cols-4 sm:grid-cols-8" />
      </Section>
    </>
  );
}
