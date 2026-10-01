import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TypeIcon } from "@/components/icons";
import { StatusBadge, cn } from "@/components/ui";
import { myTasksWhere, requireUser } from "@/lib/auth";
import { MAINTENANCE_TYPES, PRIORITIES, type MaintenanceType, type Priority } from "@/lib/constants";
import { addDays, dateKey, endOfDay, formatShortDate, formatTime, formatWeekday, fromLocal, relativeDay, startOfDay, startOfWeek } from "@/lib/dates";
import { db } from "@/lib/db";
import { param, type SearchParams } from "@/lib/queries";
import { isLate } from "@/lib/tasks";

export const metadata = { title: "Minha agenda" };

export default async function GardenerAgendaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const now = new Date();
  const ref = param(sp, "semana") ? fromLocal(param(sp, "semana")) : now;
  const weekStart = startOfWeek(ref);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasks = await db.task.findMany({
    where: {
      AND: [myTasksWhere(user), { status: { not: "CANCELADA" }, scheduledAt: { gte: startOfDay(weekStart), lte: endOfDay(days[6]) } }],
    },
    include: { location: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const byDay = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const k = dateKey(t.scheduledAt);
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }
  const todayKey = dateKey(now);

  return (
    <div className="space-y-3">
      <h1 className="page-title">Minha agenda</h1>
      <div className="card flex items-center justify-between gap-2 p-1.5">
        <Link href={`/agenda?semana=${dateKey(addDays(weekStart, -7))}`} className="btn-ghost h-12 w-12 px-0" aria-label="Semana anterior">
          <ChevronLeft className="!h-5 !w-5" />
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold tabular-nums text-stone-900">
            {formatShortDate(days[0])} a {formatShortDate(days[6])}
          </p>
          <Link href="/agenda" className="text-xs font-medium text-brand-700">
            Esta semana
          </Link>
        </div>
        <Link href={`/agenda?semana=${dateKey(addDays(weekStart, 7))}`} className="btn-ghost h-12 w-12 px-0" aria-label="Próxima semana">
          <ChevronRight className="!h-5 !w-5" />
        </Link>
      </div>

      {days.map((d) => {
        const k = dateKey(d);
        const list = byDay.get(k) ?? [];
        const isToday = k === todayKey;
        return (
          <section key={k} className={cn("card p-3", isToday && "ring-2 ring-inset ring-brand-600", k < todayKey && "opacity-70")}>
            <h2 className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-base font-semibold text-stone-900">
                {formatWeekday(d)}
                {isToday && <span className="chip bg-brand-700 text-white">Hoje</span>}
              </span>
              <span className="text-sm tabular-nums text-stone-500">{relativeDay(d) === "Hoje" ? formatShortDate(d) : relativeDay(d).slice(0, 5)}</span>
            </h2>
            {list.length === 0 ? (
              <p className="px-1 text-sm text-stone-400">Sem tarefas</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {list.map((t) => {
                  const type = MAINTENANCE_TYPES[t.type as MaintenanceType] ?? MAINTENANCE_TYPES.OUTROS;
                  return (
                    <li key={t.id}>
                      <Link href={`/minhas-tarefas/${t.id}`} className="flex min-h-14 items-center gap-3 rounded-[10px] px-1 py-2.5 hover:bg-stone-50">
                        <span className={cn("h-9 w-1 shrink-0 rounded-full", PRIORITIES[t.priority as Priority]?.bar)} aria-hidden />
                        <span className="w-11 shrink-0 text-sm font-semibold tabular-nums text-stone-700">{formatTime(t.scheduledAt)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 truncate font-semibold text-stone-900">
                            <TypeIcon type={t.type} className="h-4 w-4 shrink-0 text-brand-700" />
                            {type.label}
                          </span>
                          <span className="block truncate text-sm text-stone-500">{t.location.name}</span>
                        </span>
                        <StatusBadge status={t.status} late={isLate(t, now)} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
