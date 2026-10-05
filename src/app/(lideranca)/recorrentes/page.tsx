import { Repeat } from "lucide-react";
import { db } from "@/lib/db";
import { dateKey, formatDate, formatDateTime } from "@/lib/dates";
import { getFormOptions } from "@/lib/queries";
import { parseChecklistJson } from "@/lib/tasks";
import { PERIODICITIES, labelOf } from "@/lib/constants";
import { GENERATION_HORIZON_DAYS } from "@/lib/recurrence";
import { plural } from "@/lib/text";
import { Paged } from "@/components/paged";
import { RecurrenceDialogButton, ToggleRecurrenceButton } from "@/components/recurrence-form";
import { EmptyState, PageHeader, PriorityBadge, TypeLabel, cn } from "@/components/ui";

export const metadata = { title: "Manutenções recorrentes" };

export default async function RecurrencesPage() {
  const now = new Date();
  const [options, recs] = await Promise.all([
    getFormOptions(),
    db.recurringMaintenance.findMany({
      include: {
        location: { select: { name: true } },
        area: { select: { name: true } },
        assigneeUser: { select: { name: true } },
        assigneeTeam: { select: { name: true } },
        schedule: { select: { name: true } },
        createdBy: { select: { name: true } },
        tasks: { where: { deletedAt: null, scheduledAt: { gte: now }, status: { not: "CANCELADA" } }, orderBy: { scheduledAt: "asc" }, take: 3, select: { scheduledAt: true } },
        _count: { select: { tasks: { where: { status: "CONCLUIDA" } } } },
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Manutenções recorrentes"
        subtitle={`O sistema gera automaticamente as próximas tarefas (${GENERATION_HORIZON_DAYS} dias à frente) conforme a periodicidade.`}
        actions={<RecurrenceDialogButton options={options} label="Nova recorrência" />}
      />
      {recs.length === 0 ? (
        <EmptyState icon={Repeat} title="Nenhuma manutenção recorrente cadastrada">Crie uma recorrência para o sistema gerar as tarefas sozinho.</EmptyState>
      ) : (
        <Paged as="div" className="grid gap-3 md:grid-cols-2" pageSize={10}>
          {recs.map((r) => (
            <div key={r.id} className={cn("card card-pad", !r.active && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900">{r.title}</p>
                  <p className="text-sm text-stone-500">
                    <TypeLabel type={r.type} /> · {r.location.name} ({r.area.name})
                  </p>
                </div>
                <PriorityBadge priority={r.priority} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="chip bg-brand-100 text-brand-800">
                  {labelOf(PERIODICITIES, r.frequency)}
                  {r.frequency === "PERSONALIZADA" && ` (${r.intervalDays} dias)`}
                  {r.frequency === "QUINZENAL" && " (15 dias)"}
                </span>
                <span className="chip bg-stone-100 text-stone-700">{r.assigneeUser?.name ?? r.assigneeTeam?.name ?? "-"}</span>
                <span className="chip bg-stone-100 text-stone-700">{r.timeOfDay}</span>
                <span className="chip bg-stone-100 text-stone-700">{plural(parseChecklistJson(r.checklistJson).length, "item", "itens")}</span>
                <span className="chip bg-stone-100 text-stone-700">{plural(r._count.tasks, "concluída", "concluídas")}</span>
                {!r.active && <span className="chip bg-stone-800 text-white">Pausada</span>}
              </div>
              <p className="mt-2 text-xs text-stone-500">
                De {formatDate(r.startDate)} {r.endDate ? `até ${formatDate(r.endDate)}` : "sem data final"}
                {r.schedule && ` · Cronograma: ${r.schedule.name}`}
              </p>
              <p className="mt-1 text-xs text-stone-600">
                <span className="font-medium text-stone-900">Próximas:</span> {r.tasks.length ? r.tasks.map((t) => formatDate(t.scheduledAt)).join(", ") : "-"}
              </p>
              <p className="text-xs text-stone-400">Criada por {r.createdBy.name} em {formatDateTime(r.createdAt)}</p>
              <div className="mt-3 flex gap-2.5 border-t border-stone-100 pt-3">
                <RecurrenceDialogButton
                  options={options}
                  label="Editar"
                  className="btn-ghost"
                  initial={{
                    id: r.id,
                    title: r.title,
                    type: r.type,
                    priority: r.priority,
                    locationId: r.locationId,
                    assignee: r.assigneeUserId ? `user:${r.assigneeUserId}` : r.assigneeTeamId ? `team:${r.assigneeTeamId}` : "",
                    frequency: r.frequency,
                    intervalDays: r.intervalDays,
                    startDate: dateKey(r.startDate),
                    endDate: r.endDate ? dateKey(r.endDate) : undefined,
                    timeOfDay: r.timeOfDay,
                    durationHours: r.durationHours,
                    instructions: r.instructions ?? undefined,
                    scheduleId: r.scheduleId ?? undefined,
                    checklist: parseChecklistJson(r.checklistJson),
                  }}
                />
                <ToggleRecurrenceButton id={r.id} active={r.active} />
              </div>
            </div>
          ))}
        </Paged>
      )}
    </>
  );
}
