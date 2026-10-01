import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { MAINTENANCE_TYPES, PERIODICITIES, TASK_STATUS, labelOf, type TaskStatus } from "@/lib/constants";
import { formatDate, formatDateTime, formatDuration } from "@/lib/dates";
import { toPhotoView } from "@/lib/queries";
import { summarizeLocation, type LocationOverview } from "@/lib/location-data";
import { occurrenceCode } from "@/lib/tasks";
import { BeforeAfter, PhotoGallery } from "./photos";
import { Timeline } from "./timeline";
import { EmptyState, InfoRow, OccurrenceStatusBadge, OccurrenceTypeLabel, PriorityBadge, Section, StatCard, StatusBadge, TypeLabel, cn } from "./ui";

/** Histórico completo do local: realizadas e programadas. */
export function LocationHistory({ loc, taskHref }: { loc: LocationOverview; taskHref: string }) {
  const tasks = loc.tasks.filter((t) => t.status !== "CANCELADA" || t.cancelReason);
  if (!tasks.length) return <EmptyState icon={ClipboardList} title="Sem registros de manutenção" />;
  return (
    <ul className="divide-y divide-stone-100">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link href={`${taskHref}${t.id}`} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-stone-50">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", TASK_STATUS[t.status as TaskStatus]?.dot)} aria-hidden />
            <span className="w-24 shrink-0 text-sm tabular-nums text-stone-600">{formatDate(t.approvedAt ?? t.scheduledAt)}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm text-stone-900">
              <TypeLabel type={t.type} /> · {t.assigneeUser?.name ?? t.assigneeTeam?.name ?? "-"}
              {t.totalMinutes > 0 && <span className="text-stone-500"> · {formatDuration(t.totalMinutes)}</span>}
            </span>
            <span className="hidden sm:block">
              <StatusBadge status={t.status} />
            </span>
            <span className="text-xs text-stone-500 sm:hidden">{TASK_STATUS[t.status as TaskStatus]?.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OccurrenceList({ occurrences, leader }: { occurrences: LocationOverview["occurrences"]; leader?: boolean }) {
  if (!occurrences.length) return <p className="text-sm text-stone-500">Nenhuma ocorrência.</p>;
  return (
    <ul className="space-y-2">
      {occurrences.map((o) => (
        <li key={o.id} className="rounded-[10px] bg-stone-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
              <span className="font-normal tabular-nums text-stone-500">{occurrenceCode(o.number)}</span> <OccurrenceTypeLabel type={o.type} />
            </span>
            <span className="flex gap-1.5">
              <PriorityBadge priority={o.priority} />
              <OccurrenceStatusBadge status={o.status} />
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-700">{o.description}</p>
          <p className="mt-1 text-xs tabular-nums text-stone-500">
            {o.reportedBy.name} · {formatDateTime(o.createdAt)}
          </p>
          {o.photos.length > 0 && (
            <div className="mt-2">
              <PhotoGallery photos={o.photos.map(toPhotoView)} columns="grid-cols-5" />
            </div>
          )}
          {leader && o.status === "ABERTA" && (
            <Link href={`/tarefas/nova?ocorrencia=${o.id}`} className="btn-primary mt-2.5 min-h-9 px-3 text-sm">
              Converter em tarefa <ArrowRight />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export function LocationStats({ loc }: { loc: LocationOverview }) {
  const s = summarizeLocation(loc);
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <StatCard
        label="Última manutenção"
        value={s.lastCompleted ? formatDate(s.lastCompleted.approvedAt) : "Sem registro"}
        hint={s.lastCompleted ? `${labelOf(MAINTENANCE_TYPES, s.lastCompleted.type)} · ${s.lastCompleted.assigneeUser?.name ?? s.lastCompleted.assigneeTeam?.name ?? ""}` : "Nenhuma concluída ainda"}
      />
      <StatCard label="Próxima manutenção" value={s.next ? formatDate(s.next.scheduledAt) : "Nada programado"} hint={s.next ? labelOf(MAINTENANCE_TYPES, s.next.type) : undefined} />
      <StatCard label="Tarefas abertas" value={s.open.length} tone="orange" />
      <StatCard label="Ocorrências abertas" value={s.openOccurrences.length} tone="yellow" />
    </div>
  );
}

/** Visão da liderança sobre um local (página do local, planta e QR Code). */
export function LocationLeaderView({ loc, qr, compact }: { loc: LocationOverview; qr?: React.ReactNode; compact?: boolean }) {
  const s = summarizeLocation(loc);
  const last = s.lastCompleted;
  const lastPhotos = last ? last.photos.map(toPhotoView) : [];
  return (
    <div className="space-y-4">
      <LocationStats loc={loc} />
      <div className={cn("grid gap-4", !compact && "lg:grid-cols-3")}>
        <div className={cn("space-y-4", !compact && "lg:col-span-2")}>
          <Section title={last ? `Antes e depois · ${formatDate(last.approvedAt)}` : "Antes e depois"}>
            {last ? <BeforeAfter before={lastPhotos.filter((p) => p.stage === "ANTES")} after={lastPhotos.filter((p) => p.stage === "DEPOIS")} /> : <p className="text-sm text-stone-500">Nenhuma manutenção concluída ainda.</p>}
          </Section>
          <Section title={<>Tarefas abertas <span className="font-normal tabular-nums text-stone-500">{s.open.length}</span></>}>
            {s.open.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhuma tarefa aberta.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {s.open
                  .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
                  .map((t) => (
                    <li key={t.id}>
                      <Link href={`/tarefas/${t.id}`} className="-mx-2 flex flex-wrap items-center justify-between gap-2 rounded-[10px] px-2 py-2.5 hover:bg-stone-50">
                        <span className="text-sm font-semibold text-stone-900">
                          <span className="flex items-center gap-1"><TypeLabel type={t.type} /> · {t.title}</span>
                          <span className="block text-xs font-normal text-stone-500">
                            {formatDate(t.scheduledAt)} · {t.assigneeUser?.name ?? t.assigneeTeam?.name}
                          </span>
                        </span>
                        <span className="flex gap-1.5">
                          <PriorityBadge priority={t.priority} />
                          <StatusBadge status={t.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Section>
          <Section title="Histórico do local">
            <LocationHistory loc={loc} taskHref="/tarefas/" />
          </Section>
          <Section title={<>Ocorrências <span className="font-normal tabular-nums text-stone-500">{loc.occurrences.length}</span></>}>
            <OccurrenceList occurrences={loc.occurrences} leader />
          </Section>
        </div>
        <div className="space-y-4">
          {qr}
          <Section title="Dados do local">
            <dl>
              <InfoRow label="Código">{loc.code}</InfoRow>
              <InfoRow label="Área">{loc.area.name}</InfoRow>
              {loc.description && <InfoRow label="Descrição">{loc.description}</InfoRow>}
              <InfoRow label="Responsável">{loc.responsibleUser?.name ?? loc.responsibleTeam?.name ?? "-"}</InfoRow>
              <InfoRow label="Frequência">{labelOf(PERIODICITIES, loc.maintenanceFrequency)}</InfoRow>
              {loc.address && <InfoRow label="Localização">{loc.address}</InfoRow>}
              {loc.latitude != null && loc.longitude != null && (
                <InfoRow label="Coordenadas">
                  <a className="font-medium tabular-nums text-brand-700 underline underline-offset-2" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}>
                    {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)} 
                  </a>
                </InfoRow>
              )}
              {loc.notes && <InfoRow label="Observações">{loc.notes}</InfoRow>}
            </dl>
          </Section>
          <Section title="Fotos do local">
            <PhotoGallery photos={loc.photos.map(toPhotoView)} columns="grid-cols-3" deletableIds={loc.photos.map((p) => p.id)} />
          </Section>
          {!compact && (
            <Section title="Alterações e registros">
              <Timeline entries={loc.auditLogs} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
