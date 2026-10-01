import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { GardenerTaskCard } from "@/components/gardener-task-card";
import { EmptyState, StatusDot, cn } from "@/components/ui";
import { myTasksWhere, requireUser } from "@/lib/auth";
import { PRIORITIES, type Priority } from "@/lib/constants";
import { addDays, endOfDay, formatDate, formatWeekday, startOfDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { gardenerCardInclude, toGardenerCard } from "@/lib/gardener";

export const metadata = { title: "Minhas tarefas" };

const STATUS_ORDER: Record<string, number> = { EM_ANDAMENTO: 0, ATRASADA: 1, PENDENTE: 2, PROGRAMADA: 3 };

export default async function MyTasksPage() {
  const user = await requireUser();
  const now = new Date();
  const todayEnd = endOfDay(now);
  const mine = myTasksWhere(user);

  const [open, upcoming, awaiting, doneToday] = await Promise.all([
    db.task.findMany({
      where: {
        AND: [mine, { OR: [{ status: { in: ["EM_ANDAMENTO", "ATRASADA"] } }, { status: { in: ["PENDENTE", "PROGRAMADA"] }, scheduledAt: { lte: todayEnd } }] }],
      },
      include: gardenerCardInclude,
    }),
    db.task.findMany({
      where: { AND: [mine, { status: { in: ["PROGRAMADA", "PENDENTE"] }, scheduledAt: { gt: todayEnd, lte: endOfDay(addDays(now, 7)) } }] },
      include: gardenerCardInclude,
      orderBy: { scheduledAt: "asc" },
      take: 10,
    }),
    db.task.count({ where: { ...mine, status: "AGUARDANDO_APROVACAO" } }),
    db.task.count({ where: { ...mine, submittedAt: { gte: startOfDay(now) }, status: { in: ["AGUARDANDO_APROVACAO", "CONCLUIDA"] } } }),
  ]);

  const today = open
    .map((t) => toGardenerCard(t, now))
    .sort(
      (a, b) =>
        (a.late === b.late ? 0 : a.late ? -1 : 1) ||
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
        PRIORITIES[b.priority as Priority].weight - PRIORITIES[a.priority as Priority].weight ||
        a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
  const next = upcoming.map((t) => toGardenerCard(t, now));
  const lateCount = today.filter((t) => t.late).length;

  return (
    <div className="space-y-5">
      <AutoRefresh seconds={45} />
      <div>
        <h1 className="page-title">Minhas tarefas</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {formatWeekday(now)}, {formatDate(now)}
        </p>
      </div>

      <div className="card grid grid-cols-3 divide-x divide-stone-100 py-3 text-center">
        <div className="px-2">
          <p className="text-[28px] font-bold leading-8 tabular-nums text-stone-900">{today.length}</p>
          <p className="mt-0.5 text-xs text-stone-500">Para hoje</p>
        </div>
        <div className="px-2">
          <p className={cn("text-[28px] font-bold leading-8 tabular-nums", lateCount ? "text-red-600" : "text-stone-900")}>{lateCount}</p>
          <p className="mt-0.5 text-xs text-stone-500">Atrasadas</p>
        </div>
        <Link href="/concluidas" className="rounded-lg px-2 hover:bg-stone-50">
          <p className="text-[28px] font-bold leading-8 tabular-nums text-green-700">{doneToday}</p>
          <p className="mt-0.5 text-xs text-stone-500">Feitas hoje</p>
        </Link>
      </div>

      <section>
        <h2 className="mb-2.5 flex items-baseline justify-between">
          <span className="text-[20px] font-semibold text-stone-900">Hoje</span>
          <span className="text-sm text-stone-500">{today.length === 1 ? "1 tarefa" : `${today.length} tarefas`}</span>
        </h2>
        {today.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Tudo em dia">Você não tem tarefas pendentes para hoje.</EmptyState>
        ) : (
          <div className="space-y-3">
            {today.map((t) => (
              <GardenerTaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>

      {awaiting > 0 && (
        <Link href="/concluidas" className="card flex min-h-14 items-center gap-3 px-4 py-3 text-sm hover:bg-stone-50">
          <StatusDot status="AGUARDANDO_APROVACAO" />
          <span className="flex-1 text-stone-800">
            {awaiting === 1 ? "1 tarefa aguardando" : `${awaiting} tarefas aguardando`} aprovação da liderança
          </span>
          <ChevronRight className="h-4 w-4 text-stone-400" aria-hidden />
        </Link>
      )}

      <section>
        <h2 className="mb-2.5 text-[20px] font-semibold text-stone-900">Próximos dias</h2>
        {next.length === 0 ? (
          <p className="card p-4 text-sm text-stone-500">Nada programado para os próximos 7 dias.</p>
        ) : (
          <div className="space-y-3">
            {next.map((t) => (
              <GardenerTaskCard key={t.id} task={t} />
            ))}
          </div>
        )}
        <Link href="/agenda" className="btn-ghost mt-2 w-full">
          Ver agenda completa <ChevronRight />
        </Link>
      </section>
    </div>
  );
}
