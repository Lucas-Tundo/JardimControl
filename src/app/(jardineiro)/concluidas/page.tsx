import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { TypeIcon } from "@/components/icons";
import { EmptyState, StatusBadge } from "@/components/ui";
import { myTasksWhere, requireUser } from "@/lib/auth";
import { MAINTENANCE_TYPES, type MaintenanceType } from "@/lib/constants";
import { formatDateTime, formatDuration } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata = { title: "Tarefas feitas" };

export default async function DoneTasksPage() {
  const user = await requireUser();
  const [awaiting, done] = await Promise.all([
    db.task.findMany({
      where: { AND: [myTasksWhere(user), { status: "AGUARDANDO_APROVACAO" }] },
      include: { location: { select: { name: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    db.task.findMany({
      where: { AND: [myTasksWhere(user), { status: "CONCLUIDA" }] },
      include: { location: { select: { name: true } }, approvedBy: { select: { name: true } } },
      orderBy: { approvedAt: "desc" },
      take: 50,
    }),
  ]);

  const row = (t: (typeof done)[number] | (typeof awaiting)[number], date: Date | null, extra?: string) => {
    const type = MAINTENANCE_TYPES[t.type as MaintenanceType] ?? MAINTENANCE_TYPES.OUTROS;
    return (
      <li key={t.id}>
        <Link href={`/minhas-tarefas/${t.id}`} className="flex gap-3 rounded-[10px] px-2 py-3 hover:bg-stone-50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-brand-50 text-brand-700">
            <TypeIcon type={t.type} className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="font-semibold text-stone-900">{type.label}</span>
              <StatusBadge status={t.status} />
            </span>
            <span className="block text-sm text-stone-600">{t.location.name}</span>
            <span className="mt-0.5 block text-xs tabular-nums text-stone-500">
              {formatDateTime(date)}
              {t.totalMinutes > 0 && ` · ${formatDuration(t.totalMinutes)}`}
              {extra && ` · ${extra}`}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Tarefas feitas</h1>

      <section>
        <h2 className="mb-2 flex items-baseline justify-between">
          <span className="text-[17px] font-semibold text-stone-900">Aguardando aprovação</span>
          <span className="text-sm tabular-nums text-stone-500">{awaiting.length}</span>
        </h2>
        {awaiting.length === 0 ? (
          <p className="card p-4 text-sm text-stone-500">Nenhuma tarefa aguardando aprovação.</p>
        ) : (
          <ul className="card divide-y divide-stone-100 p-1.5">{awaiting.map((t) => row(t, t.submittedAt, "enviada"))}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-baseline justify-between">
          <span className="text-[17px] font-semibold text-stone-900">Concluídas</span>
          {done.length > 0 && <span className="text-sm text-stone-500">{done.length === 50 ? "Últimas 50" : done.length}</span>}
        </h2>
        {done.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Nenhuma tarefa concluída ainda">
            Quando a liderança aprovar seus serviços, eles aparecem aqui.
          </EmptyState>
        ) : (
          <ul className="card divide-y divide-stone-100 p-1.5">{done.map((t) => row(t, t.approvedAt, t.approvedBy ? `aprovada por ${t.approvedBy.name}` : undefined))}</ul>
        )}
      </section>
    </div>
  );
}
