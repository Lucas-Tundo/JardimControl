"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isLeader } from "@/lib/auth";
import { audit, diffFields } from "@/lib/audit";
import { imagesFrom, saveImage, saveImages } from "@/lib/files";
import { PERIODICITIES } from "@/lib/constants";
import { errorMessage, fail, num, oneOf, optStr, parseAssignee, str, type ActionResult } from "@/lib/action-utils";
import { plural } from "@/lib/text";

async function leader() {
  const user = await getCurrentUser();
  return user && isLeader(user) ? user : null;
}

const clamp = (v: number | null, min: number, max: number, fallback: number) => (v === null ? fallback : Math.min(max, Math.max(min, v)));

export async function saveArea(areaId: string | null, form: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const name = str(form, "name");
  const code = str(form, "code").toUpperCase();
  if (!name || !code) return fail("Informe nome e código da área.");
  const data = {
    name,
    code,
    description: optStr(form, "description"),
    color: str(form, "color") || "#bbf7d0",
    mapX: clamp(num(form, "mapX"), 0, 95, 5),
    mapY: clamp(num(form, "mapY"), 0, 95, 5),
    mapW: clamp(num(form, "mapW"), 3, 100, 20),
    mapH: clamp(num(form, "mapH"), 3, 100, 15),
  };
  const dup = await db.area.findFirst({ where: { code, NOT: areaId ? { id: areaId } : undefined } });
  if (dup) return fail("Já existe uma área com este código.");
  const area = areaId ? await db.area.update({ where: { id: areaId }, data }) : await db.area.create({ data });
  await audit({ entityType: "AREA", entityId: area.id, action: areaId ? "ALTERADA" : "CRIADA", summary: `Área "${name}" ${areaId ? "atualizada" : "cadastrada"}`, userId: user.id });
  revalidatePath("/", "layout");
  return { ok: true, data: { id: area.id }, message: "Área salva." };
}

export async function deleteArea(areaId: string): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const count = await db.location.count({ where: { areaId } });
  if (count > 0) return fail("Remova ou mova os locais desta área antes de excluí-la.");
  const tasks = await db.task.count({ where: { areaId } });
  if (tasks > 0) return fail("Esta área possui histórico de tarefas e não pode ser excluída.");
  const area = await db.area.delete({ where: { id: areaId } });
  await audit({ entityType: "AREA", entityId: areaId, action: "EXCLUIDA", summary: `Área "${area.name}" excluída`, userId: user.id });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAreaRect(areaId: string, rect: { x: number; y: number; w: number; h: number }): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  await db.area.update({
    where: { id: areaId },
    data: { mapX: clamp(rect.x, 0, 97, 0), mapY: clamp(rect.y, 0, 97, 0), mapW: clamp(rect.w, 3, 100, 10), mapH: clamp(rect.h, 3, 100, 10) },
  });
  revalidatePath("/mapa");
  return { ok: true };
}

const LOCATION_LABELS = {
  name: "Nome",
  code: "Código",
  areaId: "Área",
  description: "Descrição",
  address: "Localização",
  latitude: "Latitude",
  longitude: "Longitude",
  responsibleUserId: "Responsável",
  responsibleTeamId: "Equipe responsável",
  maintenanceFrequency: "Frequência",
  notes: "Observações",
};

export async function saveLocation(locationId: string | null, form: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const name = str(form, "name");
  const code = str(form, "code").toUpperCase();
  const areaId = str(form, "areaId");
  if (!name || !code) return fail("Informe nome e código do local.");
  if (!areaId) return fail("Selecione a área.");
  const dup = await db.location.findFirst({ where: { code, NOT: locationId ? { id: locationId } : undefined } });
  if (dup) return fail("Já existe um local com este código.");

  const { assigneeUserId, assigneeTeamId } = parseAssignee(str(form, "responsible"));
  const data = {
    name,
    code,
    areaId,
    description: optStr(form, "description"),
    address: optStr(form, "address"),
    latitude: num(form, "latitude"),
    longitude: num(form, "longitude"),
    responsibleUserId: assigneeUserId,
    responsibleTeamId: assigneeTeamId,
    maintenanceFrequency: oneOf(str(form, "maintenanceFrequency"), PERIODICITIES) ?? null,
    notes: optStr(form, "notes"),
    mapX: num(form, "mapX"),
    mapY: num(form, "mapY"),
  };

  try {
    const saved = await saveImages(imagesFrom(form, "photos"));

    let id: string;
    if (locationId) {
      const before = await db.location.findUnique({ where: { id: locationId } });
      if (!before) return fail("Local não encontrado.");
      await db.location.update({ where: { id: locationId }, data });
      const changes = diffFields(before, data, LOCATION_LABELS);
      await audit({ entityType: "LOCATION", entityId: locationId, action: "ALTERADO", summary: changes.length ? `Local alterado: ${changes.map((c) => c.field).join(", ")}` : "Local atualizado", userId: user.id, locationId, details: { alteracoes: changes } });
      id = locationId;
    } else {
      const created = await db.location.create({ data: { ...data, qrCode: { create: { token: randomBytes(8).toString("base64url") } } } });
      await audit({ entityType: "LOCATION", entityId: created.id, action: "CRIADO", summary: `Local "${name}" cadastrado com QR Code`, userId: user.id, locationId: created.id });
      id = created.id;
    }
    for (const s of saved) {
      await db.photo.create({ data: { ...s, stage: "REFERENCIA", locationId: id, uploadedById: user.id } });
    }
    revalidatePath("/", "layout");
    return { ok: true, data: { id }, message: "Local salvo." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function addLocationPhotos(locationId: string, form: FormData): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const files = imagesFrom(form, "photos");
  if (!files.length) return fail("Selecione ao menos uma foto.");
  try {
    for (const f of files) {
      const s = await saveImage(f);
      await db.photo.create({ data: { ...s, stage: "REFERENCIA", locationId, uploadedById: user.id } });
    }
    await audit({ entityType: "LOCATION", entityId: locationId, action: "FOTOS", summary: `${plural(files.length, "foto de referência adicionada", "fotos de referência adicionadas")}`, userId: user.id, locationId });
    revalidatePath("/", "layout");
    return { ok: true, message: "Fotos adicionadas." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function setLocationPosition(locationId: string, x: number, y: number): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  await db.location.update({ where: { id: locationId }, data: { mapX: clamp(x, 0, 100, 50), mapY: clamp(y, 0, 100, 50) } });
  revalidatePath("/mapa");
  return { ok: true };
}

export async function regenerateQrCode(locationId: string): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const token = randomBytes(8).toString("base64url");
  await db.qrCode.upsert({ where: { locationId }, update: { token, scans: 0, lastScanAt: null }, create: { locationId, token } });
  await audit({ entityType: "LOCATION", entityId: locationId, action: "QR_REGERADO", summary: "QR Code regenerado (o anterior deixou de funcionar)", userId: user.id, locationId });
  revalidatePath("/", "layout");
  return { ok: true, message: "Novo QR Code gerado." };
}

export async function toggleLocationActive(locationId: string): Promise<ActionResult> {
  const user = await leader();
  if (!user) return fail("Sem permissão.");
  const loc = await db.location.findUnique({ where: { id: locationId } });
  if (!loc) return fail("Local não encontrado.");
  await db.location.update({ where: { id: locationId }, data: { active: !loc.active } });
  await audit({ entityType: "LOCATION", entityId: locationId, action: loc.active ? "DESATIVADO" : "ATIVADO", summary: `Local ${loc.active ? "desativado" : "reativado"}`, userId: user.id, locationId });
  revalidatePath("/", "layout");
  return { ok: true };
}
