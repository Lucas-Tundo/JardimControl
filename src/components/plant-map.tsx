"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { setLocationPosition } from "@/app/actions/locations";
import { useToast } from "./toast";
import { cn } from "./ui";

export type MapArea = { id: string; name: string; color: string; mapX: number; mapY: number; mapW: number; mapH: number };
export type MapPoint = {
  id: string;
  name: string;
  code: string;
  areaId: string;
  mapX: number | null;
  mapY: number | null;
  open: number;
  late: number;
  occurrences: number;
};

function pinColor(p: MapPoint) {
  if (p.late > 0) return "bg-red-600 ring-red-200";
  if (p.occurrences > 0) return "bg-amber-500 ring-amber-200";
  if (p.open > 0) return "bg-orange-500 ring-orange-200";
  return "bg-green-600 ring-green-200";
}

export function PlantMap({
  areas,
  points,
  selectedId,
  linkBase = "/mapa?local=",
  editable = false,
  height = "aspect-[16/10]",
}: {
  areas: MapArea[];
  points: MapPoint[];
  selectedId?: string;
  linkBase?: string;
  editable?: boolean;
  height?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [placing, setPlacing] = useState<string>("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const onMapClick = (e: React.MouseEvent) => {
    if (!editable || !placing || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    start(async () => {
      const res = await setLocationPosition(placing, x, y);
      if (!res.ok) return toast.show(res.error, "error");
      toast.show("Posição do local atualizada.");
      setPlacing("");
      router.refresh();
    });
  };

  const unplaced = points.filter((p) => p.mapX === null || p.mapY === null);

  return (
    <div>
      {editable && (
        <div className="mb-3 flex flex-wrap items-center gap-2.5 rounded-[10px] bg-brand-50 p-2.5 text-sm">
          <label htmlFor="map-placing" className="font-medium text-brand-900">Posicionar local</label>
          <select id="map-placing" className="input w-auto flex-1" value={placing} onChange={(e) => setPlacing(e.target.value)}>
            <option value="">Selecione um local</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.mapX === null ? " (sem posição)" : ""}
              </option>
            ))}
          </select>
          {placing && <span className="text-sm text-brand-800">Agora toque na planta onde o local fica.</span>}
          {pending && <span className="text-sm text-stone-500">Salvando...</span>}
        </div>
      )}
      <div
        ref={ref}
        onClick={onMapClick}
        className={cn("relative w-full overflow-hidden rounded-[14px] border border-stone-200 bg-[#eef3e7]", height, editable && placing && "cursor-crosshair")}
      >
        {/* Fundo: ruas e vegetação */}
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <pattern id="grass" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.35" fill="#b7cfa4" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grass)" />
          <rect x="0" y="34.5" width="100" height="3" fill="#d6d3d1" />
          <rect x="14.5" y="0" width="1.5" height="100" fill="#d6d3d1" />
          <rect x="56.5" y="0" width="1.5" height="100" fill="#d6d3d1" />
          <rect x="0" y="70" width="86" height="2.5" fill="#d6d3d1" />
        </svg>
        {areas.map((a) => (
          <div
            key={a.id}
            className="absolute flex items-start justify-start rounded-[10px] border border-white/80 p-1"
            style={{ left: `${a.mapX}%`, top: `${a.mapY}%`, width: `${a.mapW}%`, height: `${a.mapH}%`, backgroundColor: a.color + "cc" }}
          >
            <span className="rounded-md bg-white/90 px-1.5 text-xs font-medium leading-5 text-stone-700">{a.name}</span>
          </div>
        ))}
        {points
          .filter((p) => p.mapX !== null && p.mapY !== null)
          .map((p) => {
            const selected = p.id === selectedId;
            const pin = (
              <span className="group relative flex flex-col items-center">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums text-white shadow-[var(--ds-shadow-1)] ring-4 transition sm:h-7 sm:w-7", pinColor(p), selected && "scale-125 ring-brand-900")}>
                  {p.open > 0 ? p.open : <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="Em dia" />}
                </span>
                <span className={cn("mt-0.5 max-w-28 truncate rounded-md bg-white/95 px-1.5 text-xs font-medium text-stone-700 shadow-[var(--ds-shadow-1)]", selected ? "block" : "hidden group-hover:block sm:block")}>{p.name}</span>
              </span>
            );
            return (
              <div key={p.id} className="absolute z-10 -translate-x-1/2 -translate-y-3" style={{ left: `${p.mapX}%`, top: `${p.mapY}%` }}>
                {editable && placing ? pin : <Link href={`${linkBase}${p.id}`} scroll={false}>{pin}</Link>}
              </div>
            );
          })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Em dia</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Tarefas abertas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Ocorrência aberta</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Atrasada</span>
        {unplaced.length > 0 && <span className="text-stone-400">{unplaced.length === 1 ? "1 local sem posição na planta" : `${unplaced.length} locais sem posição na planta`}</span>}
      </div>
    </div>
  );
}
