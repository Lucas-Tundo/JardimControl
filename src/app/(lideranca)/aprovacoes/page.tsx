import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime, formatDuration } from "@/lib/dates";
import { photoUrl } from "@/lib/files";
import { assigneeName, taskCode } from "@/lib/tasks";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState, PageHeader, PriorityBadge, TypeLabel } from "@/components/ui";

export const metadata = { title: "Aprovações" };

export default async function ApprovalsPage() {
  const tasks = await db.task.findMany({
    where: { deletedAt: null, status: "AGUARDANDO_APROVACAO" },
    include: {
      location: { select: { name: true, photos: { where: { stage: "REFERENCIA" }, take: 1 } } },
      assigneeUser: { select: { name: true } },
      assigneeTeam: { select: { name: true } },
      checklist: { select: { done: true, required: true } },
      photos: { where: { stage: { in: ["ANTES", "DEPOIS"] } }, orderBy: { takenAt: "asc" } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <>
      <AutoRefresh seconds={20} />
      <PageHeader title="Aprovações" subtitle="Serviços finalizados pelos jardineiros aguardando análise da liderança." />
      {tasks.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="Nenhum serviço aguardando aprovação">
          Quando um jardineiro finalizar uma tarefa, ela aparecerá aqui.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => {
            const before = t.photos.find((p) => p.stage === "ANTES") ?? t.location.photos[0];
            const after = [...t.photos].reverse().find((p) => p.stage === "DEPOIS");
            const done = t.checklist.filter((c) => c.done).length;
            return (
              <Link key={t.id} href={`/tarefas/${t.id}`} className="card overflow-hidden transition-shadow duration-200 hover:shadow-[var(--ds-shadow-2)]">
                <div className="grid grid-cols-2 gap-px bg-stone-200">
                  {[{ p: before, l: "Antes", c: "bg-amber-400" }, { p: after, l: "Depois", c: "bg-green-400" }].map(({ p, l, c }) => (
                    <div key={l} className="relative aspect-[4/3] bg-stone-100">
                      {p ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl(p.fileName)} alt={l} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-stone-500">Sem foto</span>
                      )}
                      <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                        <span className={`h-1.5 w-1.5 rounded-full ${c}`} aria-hidden />
                        {l}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-stone-900">{t.title}</p>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-stone-500">
                    <span className="tabular-nums">{taskCode(t.number)}</span> · <TypeLabel type={t.type} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
                  </p>
                  <p className="mt-1.5 text-sm text-stone-700">
                    {t.location.name} · {assigneeName(t)}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-stone-500">
                    Checklist {done} de {t.checklist.length}
                    {t.totalMinutes > 0 && ` · ${formatDuration(t.totalMinutes)} de trabalho`} · enviada {formatDateTime(t.submittedAt)}
                  </p>
                  <span className="btn-primary mt-3 w-full">Analisar e aprovar</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
