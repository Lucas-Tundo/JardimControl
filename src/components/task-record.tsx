import Link from "next/link";
import { Check } from "lucide-react";
import { PERIODICITIES, TASK_ORIGINS, labelOf } from "@/lib/constants";
import { formatDate, formatDateTime, formatDuration, formatTime } from "@/lib/dates";
import { toPhotoView } from "@/lib/queries";
import { assigneeName, occurrenceCode, taskCode } from "@/lib/tasks";
import type { TaskDetail } from "@/lib/task-detail";
import { BeforeAfter, PhotoGallery } from "./photos";
import { Timeline } from "./timeline";
import { InfoRow, OccurrenceStatusBadge, OccurrenceTypeLabel, ProgressBar, Section, cn } from "./ui";

export function TimeSummary({ task }: { task: TaskDetail }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-stone-100 rounded-[10px] bg-stone-50 py-3 text-center">
      <div className="px-2">
        <p className="text-xs text-stone-500">Início</p>
        <p className="text-[17px] font-semibold tabular-nums text-stone-900">{task.startedAt ? formatTime(task.startedAt) : "Sem registro"}</p>
        <p className="text-xs tabular-nums text-stone-500">{task.startedAt ? formatDate(task.startedAt) : ""}</p>
      </div>
      <div className="px-2">
        <p className="text-xs text-stone-500">Término</p>
        <p className="text-[17px] font-semibold tabular-nums text-stone-900">{task.finishedAt ? formatTime(task.finishedAt) : "Sem registro"}</p>
        <p className="text-xs tabular-nums text-stone-500">{task.finishedAt ? formatDate(task.finishedAt) : ""}</p>
      </div>
      <div className="px-2">
        <p className="text-xs text-stone-500">Tempo total</p>
        <p className="text-[17px] font-semibold tabular-nums text-stone-900">{task.totalMinutes > 0 ? formatDuration(task.totalMinutes) : "Sem registro"}</p>
      </div>
    </div>
  );
}

export function ChecklistReadonly({ items }: { items: TaskDetail["checklist"] }) {
  if (!items.length) return <p className="text-sm text-stone-500">Esta tarefa não possui checklist.</p>;
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <ProgressBar value={done} total={items.length} />
        <span className="shrink-0 text-sm tabular-nums text-stone-600">
          {done} de {items.length}
        </span>
      </div>
      <ul className="divide-y divide-stone-100">
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-2 py-2">
            <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md", i.done ? "bg-green-600 text-white" : "shadow-[inset_0_0_0_1.5px_rgba(60,60,67,0.3)]")}>{i.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", i.done ? "text-stone-700" : "text-stone-900")}>
                {i.text} {i.required && <span className="ml-1 text-xs text-red-600">Obrigatório</span>}
              </p>
              {i.done && (
                <p className="text-xs text-stone-500">
                  {i.doneBy?.name} · {formatDateTime(i.doneAt)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Registro completo da manutenção (usado no detalhe, histórico e aprovação). */
export function TaskRecord({ task, hideTimeline, locationHref }: { task: TaskDetail; hideTimeline?: boolean; locationHref?: string }) {
  const photos = task.photos.map(toPhotoView);
  const before = photos.filter((p) => p.stage === "ANTES");
  const during = photos.filter((p) => p.stage === "DURANTE");
  const after = photos.filter((p) => p.stage === "DEPOIS");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Antes e depois">
          <BeforeAfter before={before.length ? before : task.location.photos.map(toPhotoView)} after={after} />
        </Section>

        {(task.description || task.instructions) && (
          <Section title="Instruções">
            {task.description && (
              <p className="mb-2 rounded-[10px] bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-semibold">Problema:</span> {task.description}
              </p>
            )}
            {task.instructions && <p className="whitespace-pre-line text-sm text-stone-700">{task.instructions}</p>}
          </Section>
        )}

        <Section title="Checklist">
          <ChecklistReadonly items={task.checklist} />
        </Section>

        <Section title="Galeria da manutenção">
          <div className="space-y-4">
            {[
              { label: "Antes (liderança)", list: before },
              { label: "Durante (opcional)", list: during },
              { label: "Depois (serviço finalizado)", list: after },
            ].map((g) => (
              <div key={g.label}>
                <p className="mb-1.5 text-sm font-medium text-stone-700">
                  {g.label} <span className="font-normal tabular-nums text-stone-500">· {g.list.length}</span>
                </p>
                <PhotoGallery photos={g.list} emptyText="Nenhuma foto nesta etapa." />
              </div>
            ))}
          </div>
        </Section>

        {task.executionNotes && (
          <Section title="Observações do jardineiro">
            <p className="whitespace-pre-line text-sm text-stone-700">{task.executionNotes}</p>
          </Section>
        )}

        {(task.occurrences.length > 0 || task.fromOccurrence) && (
          <Section title="Ocorrências">
            <ul className="divide-y divide-stone-100">
              {task.fromOccurrence && (
                <li className="py-2 text-sm">
                  <span className="chip mr-2 bg-blue-50 text-blue-800">Origem</span>
                  {occurrenceCode(task.fromOccurrence.number)} · <OccurrenceTypeLabel type={task.fromOccurrence.type} /> · {task.fromOccurrence.description}
                  <span className="block text-xs text-stone-500">
                    {task.fromOccurrence.reportedBy.name} · {formatDateTime(task.fromOccurrence.createdAt)}
                  </span>
                </li>
              )}
              {task.occurrences.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                  <div>
                    {occurrenceCode(o.number)} · <OccurrenceTypeLabel type={o.type} /> · {o.description}
                    <span className="block text-xs text-stone-500">
                      {o.reportedBy.name} · {formatDateTime(o.createdAt)}
                    </span>
                  </div>
                  <OccurrenceStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <div className="space-y-4">
        <Section title="Dados da tarefa">
          <dl>
            <InfoRow label="Código">{taskCode(task.number)}</InfoRow>
            <InfoRow label="Local">
              {locationHref ? (
                <Link href={locationHref} className="font-semibold text-brand-700 hover:underline">
                  {task.location.name}
                </Link>
              ) : (
                <>{task.location.name}</>
              )}
            </InfoRow>
            <InfoRow label="Área">{task.area.name}</InfoRow>
            <InfoRow label="Responsável">
              {assigneeName(task)}
              {task.assigneeTeam && <span className="block text-xs text-stone-500">{task.assigneeTeam.members.map((m) => m.user.name).join(", ")}</span>}
            </InfoRow>
            <InfoRow label="Programada">{formatDateTime(task.scheduledAt)}</InfoRow>
            <InfoRow label="Prazo">{formatDateTime(task.dueAt)}</InfoRow>
            <InfoRow label="Periodicidade">
              {labelOf(PERIODICITIES, task.periodicity)}
              {task.recurrence && <span className="block text-xs text-stone-500">Recorrência: {task.recurrence.title}</span>}
            </InfoRow>
            {task.schedule && <InfoRow label="Cronograma">{task.schedule.name}</InfoRow>}
            <InfoRow label="Origem">{labelOf(TASK_ORIGINS, task.origin)}</InfoRow>
            <InfoRow label="Criada por">
              {task.createdBy.name} · {formatDateTime(task.createdAt)}
            </InfoRow>
            {task.updatedBy && (
              <InfoRow label="Última alteração">
                {task.updatedBy.name} · {formatDateTime(task.updatedAt)}
              </InfoRow>
            )}
            {task.approvedBy && (
              <InfoRow label="Aprovada por">
                {task.approvedBy.name} · {formatDateTime(task.approvedAt)}
              </InfoRow>
            )}
            {task.cancelReason && <InfoRow label="Cancelamento">{task.cancelReason}</InfoRow>}
          </dl>
        </Section>

        <Section title="Registro de tempo">
          <TimeSummary task={task} />
          {task.timeLogs.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-stone-700">
              {task.timeLogs.map((l, i) => (
                <li key={l.id} className="flex justify-between gap-2 rounded-lg px-1 py-1">
                  <span>
                    {i === 0 ? "Execução" : `Correção ${i}`} · {l.user.name}
                  </span>
                  <span className="tabular-nums">
                    {formatShort(l.startedAt)} até {l.endedAt ? formatTime(l.endedAt) : "agora"} {l.minutes > 0 && `(${formatDuration(l.minutes)})`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Aprovação">
          {task.approvals.length === 0 ? (
            <p className="text-sm text-stone-500">{task.status === "AGUARDANDO_APROVACAO" ? "Aguardando análise da liderança." : "Ainda não enviada para aprovação."}</p>
          ) : (
            <ul className="space-y-2">
              {task.approvals.map((a) => (
                <li key={a.id} className={cn("rounded-[10px] p-3 text-sm", a.decision === "APROVADA" ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900")}>
                  <p className="font-semibold">{a.decision === "APROVADA" ? "Aprovada" : "Devolvida para correção"}</p>
                  {a.comment && <p className="mt-0.5">{a.comment}</p>}
                  <p className="mt-1 text-xs tabular-nums opacity-75">
                    {a.reviewer.name} · {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {!hideTimeline && (
          <Section title="Histórico e rastreabilidade">
            <Timeline entries={task.auditLogs} />
          </Section>
        )}
      </div>
    </div>
  );
}

function formatShort(d: Date) {
  return `${formatDate(d).slice(0, 5)} ${formatTime(d)}`;
}
