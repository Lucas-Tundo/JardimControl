import { db } from "./db";
import type { MapArea, MapPoint } from "@/components/plant-map";

export async function getMapData(): Promise<{ areas: MapArea[]; points: MapPoint[] }> {
  const now = new Date();
  const [areas, locations, open, late, occ] = await Promise.all([
    db.area.findMany({ orderBy: { name: "asc" } }),
    db.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.task.groupBy({ by: ["locationId"], where: { deletedAt: null, status: { in: ["PENDENTE", "ATRASADA", "EM_ANDAMENTO", "AGUARDANDO_APROVACAO"] } }, _count: true }),
    db.task.groupBy({
      by: ["locationId"],
      where: { deletedAt: null, OR: [{ status: "ATRASADA" }, { status: "EM_ANDAMENTO", dueAt: { lt: now } }] },
      _count: true,
    }),
    db.occurrence.groupBy({ by: ["locationId"], where: { status: "ABERTA" }, _count: true }),
  ]);
  const count = (list: { locationId: string; _count: number }[], id: string) => list.find((x) => x.locationId === id)?._count ?? 0;
  return {
    areas: areas.map((a) => ({ id: a.id, name: a.name, color: a.color, mapX: a.mapX, mapY: a.mapY, mapW: a.mapW, mapH: a.mapH })),
    points: locations.map((l) => ({
      id: l.id,
      name: l.name,
      code: l.code,
      areaId: l.areaId,
      mapX: l.mapX,
      mapY: l.mapY,
      open: count(open, l.id),
      late: count(late, l.id),
      occurrences: count(occ, l.id),
    })),
  };
}
