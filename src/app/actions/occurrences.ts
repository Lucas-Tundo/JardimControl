"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isLeader } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyLeaders, notifyUsers } from "@/lib/notify";
import { imagesFrom, saveImage, saveImages } from "@/lib/files";
import { nextOccurrenceNumber, occurrenceCode } from "@/lib/tasks";
import { OCCURRENCE_TYPES, PRIORITIES, labelOf } from "@/lib/constants";
import { errorMessage, fail, oneOf, optStr, str, type ActionResult } from "@/lib/action-utils";

/** Registrar ocorrência · disponível para jardineiros e liderança. */
export async function createOccurrence(form: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail("Sessão expirada.");

  const type = oneOf(str(form, "type"), OCCURRENCE_TYPES);
  const priority = oneOf(str(form, "priority"), PRIORITIES, "MEDIA") ?? "MEDIA";
  const description = str(form, "description");
  const locationId = str(form, "locationId");
  const taskId = optStr(form, "taskId");
  const responsibleUserId = optStr(form, "responsibleUserId");
  if (!type) return fail("Selecione o tipo de ocorrência.");
  if (description.length < 3) return fail("Descreva o problema encontrado.");
  const location = await db.location.findUnique({ where: { id: locationId } });
  if (!location) return fail("Selecione o local.");

  try {
    const saved = await saveImages(imagesFrom(form, "photos"));

    const occ = await db.$transaction(async (tx) => {
      const number = await nextOccurrenceNumber(tx);
      const created = await tx.occurrence.create({
        data: {
          number,
          type,
          description,
          priority,
          locationId: location.id,
          reportedById: user.id,
          responsibleUserId: responsibleUserId ?? (isLeader(user) ? null : user.id),
          taskId,
        },
      });
      for (const s of saved) {
        await tx.photo.create({ data: { ...s, stage: "OCORRENCIA", occurrenceId: created.id, locationId: location.id, uploadedById: user.id, taskId: null } });
      }
      await audit(
        {
          entityType: "OCCURRENCE",
          entityId: created.id,
          action: "CRIADA",
          summary: `${occurrenceCode(number)} · ${labelOf(OCCURRENCE_TYPES, type)} registrada por ${user.name}`,
          userId: user.id,
          locationId: location.id,
          taskId,
        },
        tx,
      );
      const msg = {
        type: "NOVA_OCORRENCIA" as const,
        title: priority === "URGENTE" ? "Ocorrência URGENTE" : "Nova ocorrência",
        message: `${labelOf(OCCURRENCE_TYPES, type)} · ${location.name}: ${description.slice(0, 90)}`,
        link: `/ocorrencias?id=${created.id}`,
      };
      await notifyLeaders(msg, tx, user.id);
      if (responsibleUserId && responsibleUserId !== user.id) await notifyUsers([responsibleUserId], { ...msg, link: "/minhas-tarefas" }, tx);
      return created;
    });

    revalidatePath("/", "layout");
    return { ok: true, data: { id: occ.id }, message: "Ocorrência registrada." };
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function resolveOccurrence(id: string, notes: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !isLeader(user)) return fail("Apenas a liderança pode encerrar ocorrências.");
  const occ = await db.occurrence.findUnique({ where: { id } });
  if (!occ) return fail("Ocorrência não encontrada.");
  if (occ.status !== "ABERTA") return fail("A ocorrência já foi tratada.");
  await db.occurrence.update({ where: { id }, data: { status: "RESOLVIDA", resolvedAt: new Date(), resolvedById: user.id, resolutionNotes: notes.trim() || null } });
  await audit({ entityType: "OCCURRENCE", entityId: id, action: "RESOLVIDA", summary: `${occurrenceCode(occ.number)} encerrada${notes.trim() ? `: ${notes.trim()}` : ""}`, userId: user.id, locationId: occ.locationId });
  revalidatePath("/", "layout");
  return { ok: true, message: "Ocorrência encerrada." };
}
