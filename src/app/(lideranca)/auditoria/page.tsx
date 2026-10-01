import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { EmptyState, PageHeader, Section } from "@/components/ui";
import { endOfDay, formatDateTime, fromLocal } from "@/lib/dates";
import { db } from "@/lib/db";
import { param, type SearchParams } from "@/lib/queries";
import { taskCode } from "@/lib/tasks";

export const metadata = { title: "Rastreabilidade" };

const ENTITIES: Record<string, string> = {
  TASK: "Tarefas",
  LOCATION: "Locais",
  AREA: "Áreas",
  OCCURRENCE: "Ocorrências",
  USER: "Usuários",
  TEAM: "Equipes",
  RECURRENCE: "Recorrências",
  SCHEDULE: "Cronogramas",
  CHECKLIST: "Checklists",
  REPORT: "Relatórios",
};

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  ENVIADA_APROVACAO: "Enviada para aprovação",
  OBSERVACAO: "Observação",
  EXCLUIDA: "Excluída",
  EXCLUIDO: "Excluído",
  EXCLUIDA_DEFINITIVAMENTE: "Excluída definitivamente",
  FOTOS_REFERENCIA: "Fotos de referência",
  QR_REGERADO: "QR Code regenerado",
  FOTO_REMOVIDA: "Foto removida",
};

function actionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const text = action.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Details({ json }: { json: string | null }) {
  if (!json) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || (typeof data === "object" && Object.keys(data).length === 0)) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs font-medium text-brand-700">Ver detalhes</summary>
      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-2 text-xs text-stone-700">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(param(sp, "pagina")) || 1);
  const entity = param(sp, "entidade");
  const userId = param(sp, "usuario");
  const de = param(sp, "de");
  const ate = param(sp, "ate");
  const q = param(sp, "q");

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entityType: entity } : {}),
    ...(userId ? { userId } : {}),
    ...(de || ate ? { createdAt: { ...(de ? { gte: fromLocal(de) } : {}), ...(ate ? { lte: endOfDay(fromLocal(ate)) } : {}) } } : {}),
    ...(q ? { OR: [{ summary: { contains: q } }, { action: { contains: q.toUpperCase() } }] } : {}),
  };

  const [logs, total, users] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { name: true } }, task: { select: { id: true, number: true } }, location: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ entidade: entity, usuario: userId, de, ate, q })) if (v) u.set(k, v);
    u.set("pagina", String(p));
    return `/auditoria?${u}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Rastreabilidade" subtitle="Quem criou, alterou, executou, aprovou ou excluiu · com data e horário" />

      <form className="card card-pad grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="label">Buscar</label>
          <input name="q" className="input" defaultValue={q} placeholder="Texto do registro" />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select name="entidade" className="input" defaultValue={entity}>
            <option value="">Todos</option>
            {Object.entries(ENTITIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Usuário</label>
          <select name="usuario" className="input" defaultValue={userId}>
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">De</label>
          <input type="date" name="de" className="input" defaultValue={de} />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" name="ate" className="input" defaultValue={ate} />
        </div>
        <div className="flex gap-2.5 sm:col-span-2 lg:col-span-6">
          <button className="btn-primary">Filtrar</button>
          <Link href="/auditoria" className="btn-secondary">
            Limpar
          </Link>
        </div>
      </form>

      <Section title={total === 1 ? "1 registro" : `${total} registros`}>
        {logs.length === 0 ? (
          <EmptyState icon={History} title="Nenhum registro encontrado" />
        ) : (
          <ul className="divide-y divide-stone-100">
            {logs.map((l) => (
              <li key={l.id} className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                <span className="text-xs tabular-nums text-stone-500">{formatDateTime(l.createdAt)}</span>
                <div className="min-w-0">
                  <p className="text-sm text-stone-900">
                    <span className="chip mr-2 bg-stone-100 text-stone-700">{actionLabel(l.action)}</span>
                    {l.summary}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {l.user?.name ?? "Sistema"} · {ENTITIES[l.entityType] ?? l.entityType}
                    {l.task && (
                      <>
                        {" · "}
                        <Link href={`/tarefas/${l.task.id}`} className="font-semibold text-brand-700 hover:underline">
                          {taskCode(l.task.number)}
                        </Link>
                      </>
                    )}
                    {l.location && (
                      <>
                        {" · "}
                        <Link href={`/locais/${l.location.id}`} className="font-semibold text-brand-700 hover:underline">
                          {l.location.name}
                        </Link>
                      </>
                    )}
                  </p>
                  <Details json={l.details} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={qs(page - 1)} className="btn-secondary">
                <ChevronLeft /> Anteriores
              </Link>
            ) : (
              <span />
            )}
            <span className="text-stone-500">
              Página {page} de {pages}
            </span>
            {page < pages ? (
              <Link href={qs(page + 1)} className="btn-secondary">
                Próximos <ChevronRight />
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
