import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, addMonths, dateKey, endOfDay, endOfMonth, formatDate, formatMonth, formatTime, formatWeekday, fromLocal, startOfDay, startOfMonth, startOfWeek } from "@/lib/dates";
import { buildTaskWhere, getFormOptions, param, type SearchParams } from "@/lib/queries";
import { assigneeName, isLate, taskListInclude } from "@/lib/tasks";
import { AutoRefresh } from "@/components/auto-refresh";
import { FilterBar } from "@/components/filters";
import { ScheduleBoard, type BoardTask } from "@/components/schedule-board";
import { NewScheduleButton } from "@/components/schedule-tools";
import { EmptyState, PageHeader, PriorityBadge, StatusBadge, TypeLabel, cn } from "@/components/ui";

export const metadata = { title: "Cronograma" };

type View = "dia" | "semana" | "mes";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const view = (["dia", "semana", "mes"].includes(param(sp, "view")) ? param(sp, "view") : "semana") as View;
  const dataParam = param(sp, "data");
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? fromLocal(dataParam, "12:00") : new Date();
  const scheduleId = param(sp, "cronograma");

  let rangeStart: Date, rangeEnd: Date, prev: Date, next: Date, label: string;
  let days: Date[] = [];
  if (view === "dia") {
    rangeStart = startOfDay(ref);
    rangeEnd = endOfDay(ref);
    prev = addDays(ref, -1);
    next = addDays(ref, 1);
    label = `${formatWeekday(ref)}, ${formatDate(ref)}`;
  } else if (view === "semana") {
    rangeStart = startOfWeek(ref);
    rangeEnd = new Date(addDays(rangeStart, 7).getTime() - 1);
    days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
    prev = addDays(ref, -7);
    next = addDays(ref, 7);
    label = `${formatDate(rangeStart)} a ${formatDate(addDays(rangeStart, 6))}`;
  } else {
    const first = startOfMonth(ref);
    rangeStart = startOfWeek(first);
    const last = endOfMonth(ref);
    const total = Math.ceil((last.getTime() - rangeStart.getTime()) / 86400000 / 7) * 7;
    days = Array.from({ length: total }, (_, i) => addDays(rangeStart, i));
    rangeEnd = endOfDay(days[days.length - 1]);
    prev = addMonths(first, -1);
    next = addMonths(first, 1);
    label = formatMonth(first);
  }

  const where: Prisma.TaskWhereInput = {
    AND: [buildTaskWhere(sp), { scheduledAt: { gte: rangeStart, lte: rangeEnd } }, { status: { not: "CANCELADA" } }, scheduleId ? { scheduleId } : {}],
  };
  const [options, tasks] = await Promise.all([getFormOptions(), db.task.findMany({ where, include: taskListInclude, orderBy: { scheduledAt: "asc" } })]);

  const board: BoardTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    status: t.status,
    priority: t.priority,
    scheduledAt: t.scheduledAt,
    location: t.location.name,
    assignee: assigneeName(t),
  }));

  const qs = (patch: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v]] : [])));
    for (const [k, v] of Object.entries(patch)) v ? q.set(k, v) : q.delete(k);
    return `/cronograma?${q.toString()}`;
  };

  return (
    <>
      <AutoRefresh seconds={45} />
      <PageHeader
        title="Cronograma"
        subtitle="Arraste as tarefas não iniciadas entre as datas para reorganizar. As alterações notificam os responsáveis."
        actions={
          <>
            <NewScheduleButton />
            <Link href="/recorrentes" className="btn-secondary"><Repeat /> Recorrentes</Link>
            <Link href="/tarefas/nova" className="btn-primary"><Plus /> Nova tarefa</Link>
          </>
        }
      />

      <div className="card mb-3 flex flex-wrap items-center justify-between gap-2.5 p-3">
        <div className="inline-flex rounded-[10px] bg-stone-200/70 p-0.5">
          {(["dia", "semana", "mes"] as View[]).map((v) => (
            <Link key={v} href={qs({ view: v })} aria-current={view === v ? "page" : undefined} className={cn("inline-flex min-h-9 items-center rounded-lg px-4 text-sm font-medium transition-colors", view === v ? "bg-white text-stone-900 shadow-[var(--ds-shadow-1)]" : "text-stone-600 hover:text-stone-900")}>
              {v === "mes" ? "Mês" : v === "dia" ? "Dia" : "Semana"}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <Link href={qs({ data: dateKey(prev) })} className="btn-icon" aria-label="Período anterior"><ChevronLeft className="h-[18px] w-[18px]" /></Link>
            <Link href={qs({ data: dateKey(next) })} className="btn-icon" aria-label="Próximo período"><ChevronRight className="h-[18px] w-[18px]" /></Link>
          </div>
          <p className="text-[17px] font-semibold text-stone-900">{label}</p>
          <Link href={qs({ data: "" })} className="btn-secondary min-h-9 px-3">Hoje</Link>
        </div>
        {options.schedules.length > 0 && (
          <form className="flex w-full items-center gap-2 sm:w-auto" action="/cronograma">
            {Object.entries(sp).map(([k, v]) => (typeof v === "string" && k !== "cronograma" ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <select name="cronograma" defaultValue={scheduleId} className="input min-w-0 flex-1 sm:w-auto sm:flex-none">
              <option value="">Todos os cronogramas</option>
              {options.schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button className="btn-secondary">Filtrar</button>
          </form>
        )}
      </div>

      <FilterBar fields={["responsavel", "equipe", "area", "tipo", "status", "prioridade"]} users={options.users} teams={options.teams} areas={options.areas} />

      {view === "dia" ? (
        <div className="card card-pad">
          {tasks.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nenhuma tarefa programada para este dia">
              <Link href={`/tarefas/nova?data=${dateKey(ref)}`} className="btn-secondary mt-2"><Plus /> Criar tarefa nesta data</Link>
            </EmptyState>
          ) : (
            <ol className="divide-y divide-stone-100">
              {tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tarefas/${t.id}`} className="-mx-2 flex items-center gap-4 rounded-[10px] px-2 py-3 hover:bg-stone-50">
                    <span className="w-14 shrink-0 text-center text-[17px] font-semibold tabular-nums text-stone-900">{formatTime(t.scheduledAt)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold text-stone-900"><TypeLabel type={t.type} /> · {t.location.name}</p>
                      <p className="truncate text-sm text-stone-500">{t.title} · {assigneeName(t)}</p>
                    </div>
                    <div className="hidden flex-col items-end gap-1 sm:flex">
                      <StatusBadge status={t.status} late={isLate(t)} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <ScheduleBoard tasks={board} days={days} mode={view} month={view === "mes" ? dateKey(startOfMonth(ref)).slice(0, 7) : undefined} />
      )}
    </>
  );
}
