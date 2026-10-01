import Link from "next/link";
import { ArrowRight, Plus, TriangleAlert } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { param, photoInclude, toPhotoView, type SearchParams } from "@/lib/queries";
import { occurrenceCode, taskCode } from "@/lib/tasks";
import { OCCURRENCE_TYPES } from "@/lib/constants";
import { AutoRefresh } from "@/components/auto-refresh";
import { PhotoGallery } from "@/components/photos";
import { ResolveOccurrenceButton } from "@/components/occurrence-form";
import { EmptyState, OccurrenceStatusBadge, OccurrenceTypeLabel, PageHeader, PriorityBadge, cn } from "@/components/ui";

export const metadata = { title: "Ocorrências" };

export default async function OccurrencesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const status = "status" in sp ? param(sp, "status") : param(sp, "id") ? "" : "ABERTA";
  const type = param(sp, "tipo");
  const highlight = param(sp, "id");
  const where: Prisma.OccurrenceWhereInput = { ...(status ? { status } : {}), ...(type ? { type } : {}) };
  const [list, counts] = await Promise.all([
    db.occurrence.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, area: { select: { name: true } } } },
        reportedBy: { select: { name: true } },
        responsibleUser: { select: { name: true } },
        resolvedBy: { select: { name: true } },
        task: { select: { id: true, number: true, title: true } },
        convertedTask: { select: { id: true, number: true, title: true, status: true } },
        photos: { include: photoInclude },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.occurrence.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const tab = (s: string, label: string, n?: number) => (
    <Link
      href={`/ocorrencias?status=${s}`}
      aria-current={status === s ? "page" : undefined}
      className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors", status === s ? "bg-white text-stone-900 shadow-[var(--ds-shadow-1)]" : "text-stone-600 hover:text-stone-900")}
    >
      {label}
      {n !== undefined && <span className="tabular-nums text-stone-500">{n}</span>}
    </Link>
  );

  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader title="Ocorrências" subtitle="Problemas e necessidades de manutenção adicional registrados em campo." actions={<Link href="/ocorrencias/nova" className="btn-primary"><Plus /> Registrar ocorrência</Link>} />
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="inline-flex flex-wrap rounded-[10px] bg-stone-200/70 p-0.5">
          {tab("ABERTA", "Abertas", count("ABERTA"))}
          {tab("CONVERTIDA", "Convertidas", count("CONVERTIDA"))}
          {tab("RESOLVIDA", "Resolvidas", count("RESOLVIDA"))}
          {tab("", "Todas")}
        </div>
        <form className="flex gap-2.5" action="/ocorrencias">
          <input type="hidden" name="status" value={status} />
          <select name="tipo" defaultValue={type} className="input w-auto">
            <option value="">Todos os tipos</option>
            {Object.entries(OCCURRENCE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button className="btn-secondary">Filtrar</button>
        </form>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={TriangleAlert} title="Nenhuma ocorrência encontrada" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((o) => (
            <article key={o.id} className={cn("card card-pad", o.id === highlight && "ring-2 ring-brand-600")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs tabular-nums text-stone-500">{occurrenceCode(o.number)}</p>
                  <p className="font-semibold text-stone-900">
                    <OccurrenceTypeLabel type={o.type} />
                  </p>
                  <Link href={`/locais/${o.location.id}`} className="text-sm text-brand-700 hover:underline">
                    {o.location.name} · {o.location.area.name}
                  </Link>
                </div>
                <div className="flex gap-1.5">
                  <PriorityBadge priority={o.priority} />
                  <OccurrenceStatusBadge status={o.status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-stone-800">{o.description}</p>
              {o.photos.length > 0 && (
                <div className="mt-2">
                  <PhotoGallery photos={o.photos.map(toPhotoView)} columns="grid-cols-5" />
                </div>
              )}
              <dl className="mt-2.5 space-y-0.5 text-xs text-stone-500">
                <div>Registrada por <span className="font-medium text-stone-700">{o.reportedBy.name}</span> em {formatDateTime(o.createdAt)}</div>
                {o.responsibleUser && <div>Responsável: {o.responsibleUser.name}</div>}
                {o.task && (
                  <div>
                    Durante a tarefa <Link className="underline" href={`/tarefas/${o.task.id}`}>{taskCode(o.task.number)} · {o.task.title}</Link>
                  </div>
                )}
                {o.convertedTask && (
                  <div>
                    Convertida em <Link className="font-semibold text-brand-700 underline" href={`/tarefas/${o.convertedTask.id}`}>{taskCode(o.convertedTask.number)} · {o.convertedTask.title}</Link>
                  </div>
                )}
                {o.resolvedAt && <div>Encerrada por {o.resolvedBy?.name} em {formatDateTime(o.resolvedAt)}{o.resolutionNotes && ` · ${o.resolutionNotes}`}</div>}
              </dl>
              {o.status === "ABERTA" && (
                <div className="mt-3 flex flex-wrap gap-2.5 border-t border-stone-100 pt-3">
                  <Link href={`/tarefas/nova?ocorrencia=${o.id}`} className="btn-primary min-h-9 px-3 text-sm">Converter em tarefa <ArrowRight /></Link>
                  <ResolveOccurrenceButton id={o.id} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
