import Link from "next/link";
import { Camera, Check, Map as MapIcon, Pencil } from "lucide-react";
import { getMapData } from "@/lib/map-data";
import { getLocationOverview } from "@/lib/location-data";
import { param, type SearchParams } from "@/lib/queries";
import { AutoRefresh } from "@/components/auto-refresh";
import { PlantMap } from "@/components/plant-map";
import { LocationLeaderView } from "@/components/location-views";
import { QrCard } from "@/components/qr-card";
import { EmptyState, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "Planta da empresa" };

export default async function MapPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const selected = param(sp, "local");
  const editing = param(sp, "editar") === "1";
  const [map, loc] = await Promise.all([getMapData(), selected ? getLocationOverview({ id: selected }) : null]);

  return (
    <>
      {!editing && <AutoRefresh seconds={30} />}
      <PageHeader
        title="Planta da empresa"
        subtitle="Cada ponto é um local de manutenção. Toque em um ponto para ver tarefas, ocorrências, histórico, fotos e QR Code."
        actions={
          <>
            <Link href={editing ? "/mapa" : "/mapa?editar=1"} className={editing ? "btn-primary" : "btn-secondary"}>
              {editing ? <><Check /> Concluir edição</> : <><Pencil /> Editar planta</>}
            </Link>
            <Link href="/locais" className="btn-secondary">Áreas e locais</Link>
          </>
        }
      />
      {editing && (
        <p className="mb-3 rounded-[10px] bg-amber-50 p-3 text-sm text-amber-900">
          Modo edição: escolha um local e toque na planta para posicioná-lo. Para mudar o tamanho ou a posição dos setores, edite a área em <Link href="/locais" className="font-semibold underline">Áreas e locais</Link>.
        </p>
      )}
      <div className={cn("grid gap-4", loc && "xl:grid-cols-5")}>
        <div className={cn("card card-pad", loc && "xl:col-span-2 xl:self-start xl:sticky xl:top-20")}>
          {map.areas.length === 0 ? <EmptyState icon={MapIcon} title="Cadastre áreas para montar a planta" /> : <PlantMap areas={map.areas} points={map.points} selectedId={selected} editable={editing} />}
        </div>
        {loc && (
          <div className="xl:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-stone-900">{loc.name}</h2>
                <p className="text-sm tabular-nums text-stone-500">{loc.area.name} · {loc.code}</p>
              </div>
              <div className="flex gap-2.5">
                <Link href={`/locais/${loc.id}`} className="btn-secondary">Abrir local</Link>
                <Link href={`/ronda?local=${loc.id}`} className="btn-primary"><Camera /> Registrar</Link>
              </div>
            </div>
            <LocationLeaderView loc={loc} compact qr={<QrCard location={loc} />} />
          </div>
        )}
      </div>
    </>
  );
}
