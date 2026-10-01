import Link from "next/link";
import { MapPin, Plus, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { photoUrl } from "@/lib/files";
import { PERIODICITIES, labelOf } from "@/lib/constants";
import { AreaDialogButton } from "@/components/location-forms";
import { EmptyState, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "Áreas e locais" };

export default async function LocationsPage() {
  const now = new Date();
  const areas = await db.area.findMany({
    orderBy: { name: "asc" },
    include: {
      locations: {
        orderBy: { name: "asc" },
        include: {
          photos: { where: { stage: "REFERENCIA" }, orderBy: { createdAt: "desc" }, take: 1 },
          responsibleUser: { select: { name: true } },
          responsibleTeam: { select: { name: true } },
          tasks: { where: { deletedAt: null, status: { notIn: ["CONCLUIDA", "CANCELADA"] } }, select: { status: true, scheduledAt: true }, orderBy: { scheduledAt: "asc" } },
          _count: { select: { occurrences: { where: { status: "ABERTA" } } } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Áreas e locais"
        subtitle="Organize as áreas da empresa, os locais de manutenção e seus QR Codes."
        actions={
          <>
            <Link href="/locais/qrcodes" className="btn-secondary"><Printer /> Imprimir QR Codes</Link>
            <AreaDialogButton label="Nova área" />
            <Link href="/locais/novo" className="btn-primary"><Plus /> Novo local</Link>
          </>
        }
      />
      {areas.length === 0 && <EmptyState icon={MapPin} title="Cadastre a primeira área da empresa" />}
      <div className="space-y-5">
        {areas.map((a) => (
          <section key={a.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
              <div>
                <h2 className="flex items-center gap-2 section-title">
                  <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: a.color }} aria-hidden />
                  {a.name} <span className="text-sm font-normal tabular-nums text-stone-500">{a.code}</span>
                </h2>
                {a.description && <p className="text-sm text-stone-600">{a.description}</p>}
              </div>
              <AreaDialogButton label="Editar área" className="btn-ghost" initial={{ id: a.id, name: a.name, code: a.code, description: a.description, color: a.color, mapX: a.mapX, mapY: a.mapY, mapW: a.mapW, mapH: a.mapH }} />
            </div>
            {a.locations.length === 0 ? (
              <p className="p-4 text-sm text-stone-500">Nenhum local nesta área.</p>
            ) : (
              <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {a.locations.map((l) => {
                  const late = l.tasks.filter((t) => t.status === "ATRASADA").length;
                  const next = l.tasks.find((t) => t.scheduledAt >= now);
                  return (
                    <Link key={l.id} href={`/locais/${l.id}`} className={cn("flex gap-3 rounded-[10px] p-2 transition-colors hover:bg-stone-50", !l.active && "opacity-50")}>
                      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        {l.photos[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl(l.photos[0].fileName)} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-stone-900">{l.name}</p>
                        <p className="text-xs tabular-nums text-stone-500">
                          {l.code} · {labelOf(PERIODICITIES, l.maintenanceFrequency)}
                        </p>
                        <p className="truncate text-xs text-stone-500">{l.responsibleUser?.name ?? l.responsibleTeam?.name ?? "Sem responsável"}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                          <span className="chip bg-stone-100 text-stone-700">{l.tasks.length === 1 ? "1 aberta" : `${l.tasks.length} abertas`}</span>
                          {late > 0 && <span className="chip bg-red-50 text-red-700">{late === 1 ? "1 atrasada" : `${late} atrasadas`}</span>}
                          {l._count.occurrences > 0 && <span className="chip bg-amber-50 text-amber-800">{l._count.occurrences === 1 ? "1 ocorrência" : `${l._count.occurrences} ocorrências`}</span>}
                          {next && <span className="chip bg-stone-100 tabular-nums text-stone-700">Próxima {formatDate(next.scheduledAt)}</span>}
                          {!l.active && <span className="chip bg-stone-200 text-stone-700">Inativo</span>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
