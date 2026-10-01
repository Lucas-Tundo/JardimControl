import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, CircleCheck, CircleDot, ClipboardList, Clock, FileSpreadsheet, FileText, Hourglass, Timer, TriangleAlert } from "lucide-react";
import { FilterBar } from "@/components/filters";
import { PrintButton } from "@/components/print-button";
import { PageHeader, Section, StatCard, StatusBadge, cn } from "@/components/ui";
import { MAINTENANCE_TYPES, PRIORITIES, labelOf } from "@/lib/constants";
import { dateKey, endOfMonth, formatDateTime, formatDuration, startOfMonth } from "@/lib/dates";
import { db } from "@/lib/db";
import { getFormOptions, param, type SearchParams } from "@/lib/queries";
import { computeReport, type ReportGroupRow } from "@/lib/reports";
import { assigneeName, isLate, taskCode } from "@/lib/tasks";

export const metadata = { title: "Relatórios" };

function GroupTable({ rows, label }: { rows: ReportGroupRow[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) return <p className="text-sm text-stone-500">Sem dados no período.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
            <th className="py-2 pr-2">{label}</th>
            <th className="w-2/5 py-2 pr-2">Volume</th>
            <th className="py-2 pr-2 text-center">Total</th>
            <th className="py-2 pr-2 text-center">Concluídas</th>
            <th className="py-2 pr-2 text-center">Atrasadas</th>
            <th className="py-2 text-right">Tempo médio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-2 pr-2 font-semibold text-stone-800">{r.label}</td>
              <td className="py-2 pr-2">
                <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" title={`${r.done} concluídas de ${r.total}`}>
                  <div className="bg-green-600" style={{ width: `${(r.done / max) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${((r.total - r.done) / max) * 100}%` }} />
                </div>
              </td>
              <td className="py-2 pr-2 text-center font-semibold tabular-nums">{r.total}</td>
              <td className="py-2 pr-2 text-center tabular-nums text-green-700">{r.done}</td>
              <td className={cn("py-2 pr-2 text-center tabular-nums", r.late ? "font-semibold text-red-600" : "text-stone-400")}>{r.late}</td>
              <td className="py-2 text-right tabular-nums text-stone-600">{formatDuration(r.avgMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  if (!param(sp, "de") && !param(sp, "ate")) {
    const now = new Date();
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) qs.set(k, v);
    qs.set("de", dateKey(startOfMonth(now)));
    qs.set("ate", dateKey(endOfMonth(now)));
    redirect(`/relatorios?${qs}`);
  }

  const [data, options, recent] = await Promise.all([
    computeReport(sp),
    getFormOptions(),
    db.report.findMany({ include: { generatedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const i = data.indicators;
  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) exportQs.set(k, v);
  const exportHref = (formato: string) => `/api/relatorios/export?${new URLSearchParams({ ...Object.fromEntries(exportQs), formato })}`;
  const statusTotal = Math.max(1, data.byStatus.reduce((s, x) => s + x.count, 0));
  const ofTotal = i.total ? `de ${i.total} tarefas` : "Sem dados";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios"
        subtitle={Object.entries(data.filters)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ")}
        actions={
          <div className="no-print flex flex-wrap gap-2.5">
            <a href={exportHref("pdf")} className="btn-primary">
              <FileText /> Exportar PDF
            </a>
            <a href={exportHref("xlsx")} className="btn-secondary">
              <FileSpreadsheet /> Exportar Excel
            </a>
            <PrintButton />
          </div>
        }
      />

      <div className="no-print">
        <FilterBar fields={["periodo", "responsavel", "equipe", "area", "local", "tipo", "status", "prioridade"]} users={options.users} teams={options.teams} areas={options.areas} locations={options.locations} defaultOpen />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <StatCard label="Taxa de conclusão" value={i.total ? `${i.taxaConclusao}%` : "Sem dados"} icon={CircleCheck} tone="green" hint={i.total ? `${i.concluidas} de ${i.total} tarefas` : "Nenhuma tarefa no período"} />
        <StatCard label="Pendentes" value={i.pendentes} icon={Clock} tone="yellow" hint={ofTotal} />
        <StatCard label="Atrasadas" value={i.atrasadas} icon={TriangleAlert} tone="red" hint={ofTotal} />
        <StatCard label="Em andamento" value={i.emAndamento} icon={CircleDot} tone="orange" hint={ofTotal} />
        <StatCard label="Aguardando aprovação" value={i.aguardando} icon={Hourglass} tone="purple" hint={ofTotal} />
        <StatCard label="Tempo médio" value={i.tempoMedio ? formatDuration(i.tempoMedio) : "Sem dados"} icon={Timer} tone="blue" hint="Por tarefa concluída" />
        <StatCard label="Tempo trabalhado" value={i.tempoTotal ? formatDuration(i.tempoTotal) : "Sem dados"} icon={Clock} tone="stone" hint="Soma dos apontamentos" />
        <StatCard label="Ocorrências" value={i.ocorrencias} icon={CircleAlert} tone="orange" hint="Registradas no período" />
        <StatCard label="Total de tarefas" value={i.total} icon={ClipboardList} tone="stone" hint="No período filtrado" />
      </div>

      <Section title="Distribuição por status">
        <div className="flex h-6 overflow-hidden rounded-full bg-stone-100">
          {data.byStatus
            .filter((s) => s.count > 0)
            .map((s) => (
              <div key={s.key} style={{ width: `${(s.count / statusTotal) * 100}%`, background: s.hex }} title={`${s.label}: ${s.count}`} />
            ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.byStatus.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-sm text-stone-700">
              <span className="h-3 w-3 rounded-full" style={{ background: s.hex }} />
              {s.label}: <strong>{s.count}</strong>
            </span>
          ))}
          <span className="ml-auto text-sm text-stone-500">
            Prioridade: {data.byPriority.map((p) => `${p.label} ${p.count}`).join(" · ")}
          </span>
        </div>
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Manutenções por área">
          <GroupTable rows={data.byArea} label="Área" />
        </Section>
        <Section title="Por jardineiro / equipe">
          <GroupTable rows={data.byAssignee} label="Responsável" />
        </Section>
      </div>
      <Section title="Por tipo de serviço">
        <GroupTable rows={data.byType} label="Tipo" />
      </Section>

      <Section title={`Tarefas do período (${data.tasks.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                <th className="py-2 pr-2">Código</th>
                <th className="py-2 pr-2">Programada</th>
                <th className="py-2 pr-2">Local</th>
                <th className="py-2 pr-2">Serviço</th>
                <th className="py-2 pr-2">Responsável</th>
                <th className="py-2 pr-2">Prioridade</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 text-right">Tempo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.tasks.slice(0, 300).map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-2">
                    <Link href={`/tarefas/${t.id}`} className="font-semibold text-brand-700 hover:underline">
                      {taskCode(t.number)}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 tabular-nums text-stone-600">{formatDateTime(t.scheduledAt)}</td>
                  <td className="py-2 pr-2">{t.location.name}</td>
                  <td className="py-2 pr-2">{labelOf(MAINTENANCE_TYPES, t.type)}</td>
                  <td className="py-2 pr-2">{assigneeName(t)}</td>
                  <td className="py-2 pr-2">{labelOf(PRIORITIES, t.priority)}</td>
                  <td className="py-2 pr-2">
                    <StatusBadge status={t.status} late={isLate(t, data.generatedAt)} />
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatDuration(t.totalMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.tasks.length > 300 && <p className="mt-2 text-xs text-stone-500">Exibindo 300 de {data.tasks.length}. Exporte para ver todas.</p>}
        </div>
      </Section>

      <Section title="Relatórios gerados recentemente" className="no-print">
        {recent.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum relatório exportado ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {recent.map((r) => {
              let qs = "";
              try {
                qs = new URLSearchParams(JSON.parse(r.filters)).toString();
              } catch {}
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className={cn("mr-2 chip", r.format === "PDF" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{r.format}</span>
                    {r.title}
                    <span className="block text-xs text-stone-500">
                      {r.generatedBy.name} · {formatDateTime(r.createdAt)}
                    </span>
                  </span>
                  <Link href={`/relatorios?${qs}`} className="btn-ghost min-h-9 px-3 text-sm">
                    Reabrir filtros
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
