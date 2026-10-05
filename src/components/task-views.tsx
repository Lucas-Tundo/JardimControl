import Link from "next/link";
import { MAINTENANCE_TYPES, type MaintenanceType } from "@/lib/constants";
import { addDays, dateKey, formatMonth, formatShortDate, formatTime, formatWeekdayShort, relativeDay, startOfMonth, startOfWeek } from "@/lib/dates";
import { assigneeName, isLate, taskCode, type TaskListItem } from "@/lib/tasks";
import { Paged } from "./paged";
import { EmptyState, PriorityBadge, StatusBadge, StatusDot, TypeLabel, cn } from "./ui";
import { plural } from "@/lib/text";

export function ChecklistProgress({ items }: { items: { done: boolean; required: boolean }[] }) {
  if (!items.length) return <span className="text-xs text-stone-400">Sem checklist</span>;
  const done = items.filter((i) => i.done).length;
  return (
    <span className={cn("whitespace-nowrap text-xs tabular-nums", done === items.length ? "font-medium text-green-700" : "text-stone-500")}>
      {done} de {items.length}
    </span>
  );
}

export function TaskTable({
  tasks,
  hrefBase = "/tarefas",
  empty = "Nenhuma tarefa encontrada.",
  stickyHead = false,
}: {
  tasks: TaskListItem[];
  hrefBase?: string;
  empty?: string;
  stickyHead?: boolean;
}) {
  if (!tasks.length) return <EmptyState title={empty} />;
  return (
    <>
      <div className="-mx-1 hidden md:block">
        <Paged
          stickyHead={stickyHead}
          tableClassName={stickyHead ? undefined : "min-w-[760px]"}
          head={
            <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
              <th className="px-1 py-2 pr-3 font-medium">Tarefa</th>
              <th className="py-2 pr-3 font-medium">Local</th>
              <th className="py-2 pr-3 font-medium">Responsável</th>
              <th className="py-2 pr-3 font-medium">Data</th>
              <th className="py-2 pr-3 font-medium">Prazo</th>
              <th className="py-2 pr-3 font-medium">Prioridade</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Checklist</th>
            </tr>
          }
        >
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="px-1 py-2.5 pr-3">
                  <Link href={`${hrefBase}/${t.id}`} className="font-semibold text-stone-900 hover:text-brand-700">
                    {t.title}
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <span className="tabular-nums">{taskCode(t.number)}</span> · <TypeLabel type={t.type} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-stone-800">
                  {t.location.name}
                  <div className="text-xs text-stone-500">{t.area.name}</div>
                </td>
                <td className="py-2.5 pr-3 text-stone-800">{assigneeName(t)}</td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-stone-800">
                  {relativeDay(t.scheduledAt)}
                  <div className="text-xs tabular-nums text-stone-500">{formatTime(t.scheduledAt)}</div>
                </td>
                <td className={cn("whitespace-nowrap py-2.5 pr-3 tabular-nums", isLate(t) ? "font-semibold text-red-700" : "text-stone-800")}>
                  {formatShortDate(t.dueAt)} {formatTime(t.dueAt)}
                </td>
                <td className="py-2.5 pr-3">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge status={t.status} late={isLate(t)} />
                </td>
                <td className="py-2.5">
                  <ChecklistProgress items={t.checklist} />
                </td>
              </tr>
            ))}
        </Paged>
      </div>
      <div className="-mx-2 md:hidden">
      <Paged className="flex flex-col divide-y divide-stone-100">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link href={`${hrefBase}/${t.id}`} className="block rounded-[10px] px-2 py-3 hover:bg-stone-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">{t.title}</p>
                  <p className="truncate text-sm text-stone-500">
                    {t.location.name} · {assigneeName(t)}
                  </p>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <StatusBadge status={t.status} late={isLate(t)} />
                <span className="tabular-nums">
                  {relativeDay(t.scheduledAt)} {formatTime(t.scheduledAt)}
                </span>
                <ChecklistProgress items={t.checklist} />
              </div>
            </Link>
          </li>
        ))}
      </Paged>
      </div>
    </>
  );
}

type WeekTask = { id: string; title: string; type: string; status: string; scheduledAt: Date; location: { name: string } };

/** Cronograma semanal compacto (segunda a domingo). */
export function WeekOverview({ tasks, reference = new Date(), hrefBase = "/tarefas", compact }: { tasks: WeekTask[]; reference?: Date; hrefBase?: string; compact?: boolean }) {
  const start = startOfWeek(reference);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = dateKey(new Date());
  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-1 sm:grid-cols-7" : "grid-cols-1 md:grid-cols-7")}>
      {days.map((d) => {
        const key = dateKey(d);
        const list = tasks.filter((t) => dateKey(t.scheduledAt) === key);
        const isToday = key === today;
        return (
          <div key={key} className={cn("min-w-0 rounded-[10px] p-2", isToday ? "bg-brand-50" : "bg-stone-50")}>
            <p className={cn("mb-1.5 text-xs", isToday ? "font-semibold text-brand-800" : "font-medium text-stone-500")}>
              {formatWeekdayShort(d)} {formatShortDate(d)}
            </p>
            <div className="flex flex-col gap-1">
              {list.length === 0 && <span className="text-xs text-stone-400">Livre</span>}
              {list.slice(0, 6).map((t) => (
                <Link
                  key={t.id}
                  href={`${hrefBase}/${t.id}`}
                  className="block rounded-md bg-white px-1.5 py-1 text-xs leading-tight shadow-[var(--ds-shadow-1)] hover:bg-stone-50"
                  title={`${t.title} · ${t.location.name}`}
                >
                  <span className="flex items-center gap-1.5 font-medium text-stone-900">
                    <StatusDot status={t.status} className="h-1.5 w-1.5" />
                    <span className="truncate">{MAINTENANCE_TYPES[t.type as MaintenanceType]?.label ?? t.type}</span>
                  </span>
                  <span className="block truncate pl-3 text-stone-500">{t.location.name}</span>
                </Link>
              ))}
              {list.length > 6 && <span className="px-1 text-xs text-stone-500">Mais {list.length - 6}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Calendário mensal com quantidade de tarefas por dia. */
export function MonthCalendar({ tasks, reference = new Date(), linkBase = "/cronograma?view=dia&data=" }: { tasks: { scheduledAt: Date; status: string }[]; reference?: Date; linkBase?: string }) {
  const first = startOfMonth(reference);
  const gridStart = startOfWeek(first);
  const month = dateKey(first).slice(0, 7);
  const today = dateKey(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDay = new Map<string, { total: number; late: number; done: number }>();
  for (const t of tasks) {
    const k = dateKey(t.scheduledAt);
    const e = byDay.get(k) ?? { total: 0, late: 0, done: 0 };
    e.total++;
    if (t.status === "ATRASADA") e.late++;
    if (t.status === "CONCLUIDA") e.done++;
    byDay.set(k, e);
  }
  const lastRowNeeded = dateKey(cells[35]).slice(0, 7) === month;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-stone-700">{formatMonth(first)}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.slice(0, lastRowNeeded ? 42 : 35).map((d) => {
          const k = dateKey(d);
          const e = byDay.get(k);
          const inMonth = k.slice(0, 7) === month;
          const isToday = k === today;
          return (
            <Link
              key={k}
              href={`${linkBase}${k}`}
              title={e ? `${plural(e.total, "tarefa", "tarefas")}${e.late ? `, ${plural(e.late, "atrasada", "atrasadas")}` : ""}` : undefined}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors hover:bg-stone-100",
                !inMonth && "opacity-35",
                isToday ? "font-semibold text-brand-800 ring-1.5 ring-inset ring-brand-600" : "text-stone-700",
              )}
            >
              <span>{Number(k.slice(8))}</span>
              {e ? (
                <span className={cn("mt-0.5 text-xs leading-none", e.late ? "font-semibold text-red-600" : "text-stone-500")}>{e.total}</span>
              ) : (
                <span className="mt-0.5 text-xs leading-none text-transparent">0</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
