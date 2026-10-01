"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isAdmin, isLeader } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseChecklistJson } from "@/lib/tasks";
import { MAINTENANCE_TYPES, ROLES } from "@/lib/constants";
import { fail, oneOf, optStr, str, type ActionResult } from "@/lib/action-utils";

export async function saveUser(id: string | null, form: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !isAdmin(actor)) return fail("Apenas administradores gerenciam usuários.");
  const name = str(form, "name");
  const login = str(form, "login").toLowerCase();
  const role = oneOf(str(form, "role"), ROLES, "JARDINEIRO") ?? "JARDINEIRO";
  const password = str(form, "password");
  const teamIds = form.getAll("teamIds").map(String);
  if (!name || !login) return fail("Informe nome e login.");
  if (!/^[a-z0-9._-]{3,}$/.test(login)) return fail("Login deve ter ao menos 3 caracteres (letras, números, ponto, hífen).");
  if (!id && password.length < 6) return fail("A senha deve ter ao menos 6 caracteres.");
  if (id && password && password.length < 6) return fail("A senha deve ter ao menos 6 caracteres.");
  const dup = await db.user.findFirst({ where: { login, NOT: id ? { id } : undefined } });
  if (dup) return fail("Já existe um usuário com este login.");

  const data = { name, login, role, email: optStr(form, "email"), phone: optStr(form, "phone") };
  const user = id
    ? await db.user.update({ where: { id }, data: { ...data, ...(password ? { passwordHash: bcrypt.hashSync(password, 10) } : {}) } })
    : await db.user.create({ data: { ...data, passwordHash: bcrypt.hashSync(password, 10) } });

  await db.teamMember.deleteMany({ where: { userId: user.id, teamId: { notIn: teamIds } } });
  for (const teamId of teamIds) {
    await db.teamMember.upsert({ where: { teamId_userId: { teamId, userId: user.id } }, update: {}, create: { teamId, userId: user.id } });
  }
  await audit({ entityType: "USER", entityId: user.id, action: id ? "ALTERADO" : "CRIADO", summary: `Usuário ${name} (${ROLES[role]}) ${id ? "atualizado" : "cadastrado"}${password && id ? " · senha redefinida" : ""}`, userId: actor.id });
  revalidatePath("/", "layout");
  return { ok: true, message: "Usuário salvo." };
}

export async function toggleUserActive(id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !isAdmin(actor)) return fail("Sem permissão.");
  if (actor.id === id) return fail("Você não pode desativar o próprio usuário.");
  const u = await db.user.findUnique({ where: { id } });
  if (!u) return fail("Usuário não encontrado.");
  await db.user.update({ where: { id }, data: { active: !u.active } });
  await audit({ entityType: "USER", entityId: id, action: u.active ? "DESATIVADO" : "ATIVADO", summary: `Usuário ${u.name} ${u.active ? "desativado" : "reativado"}`, userId: actor.id });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveTeam(id: string | null, form: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !isLeader(actor)) return fail("Sem permissão.");
  const name = str(form, "name");
  if (!name) return fail("Informe o nome da equipe.");
  const memberIds = form.getAll("memberIds").map(String);
  const dup = await db.team.findFirst({ where: { name, NOT: id ? { id } : undefined } });
  if (dup) return fail("Já existe uma equipe com este nome.");
  const data = { name, description: optStr(form, "description"), color: str(form, "color") || "#16a34a" };
  const team = id ? await db.team.update({ where: { id }, data }) : await db.team.create({ data });
  await db.teamMember.deleteMany({ where: { teamId: team.id, userId: { notIn: memberIds } } });
  for (const userId of memberIds) {
    await db.teamMember.upsert({ where: { teamId_userId: { teamId: team.id, userId } }, update: {}, create: { teamId: team.id, userId } });
  }
  await audit({ entityType: "TEAM", entityId: team.id, action: id ? "ALTERADA" : "CRIADA", summary: `Equipe ${name} ${id ? "atualizada" : "criada"} (${memberIds.length} membros)`, userId: actor.id });
  revalidatePath("/", "layout");
  return { ok: true, message: "Equipe salva." };
}

export async function saveChecklistTemplate(id: string | null, form: FormData): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !isLeader(actor)) return fail("Sem permissão.");
  const name = str(form, "name");
  const type = oneOf(str(form, "type"), MAINTENANCE_TYPES);
  const items = parseChecklistJson(str(form, "items"));
  if (!name) return fail("Informe o nome do checklist.");
  if (!items.length) return fail("Adicione ao menos um item.");
  await db.$transaction(async (tx) => {
    const tpl = id
      ? await tx.checklistTemplate.update({ where: { id }, data: { name, type } })
      : await tx.checklistTemplate.create({ data: { name, type, createdById: actor.id } });
    await tx.checklistTemplateItem.deleteMany({ where: { templateId: tpl.id } });
    await tx.checklistTemplateItem.createMany({ data: items.map((i, idx) => ({ templateId: tpl.id, text: i.text, required: i.required, order: idx })) });
    await audit({ entityType: "CHECKLIST", entityId: tpl.id, action: id ? "ALTERADO" : "CRIADO", summary: `Checklist padrão "${name}" ${id ? "atualizado" : "criado"} (${items.length} itens)`, userId: actor.id }, tx);
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Checklist salvo." };
}

export async function deleteChecklistTemplate(id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || !isLeader(actor)) return fail("Sem permissão.");
  const tpl = await db.checklistTemplate.delete({ where: { id } });
  await audit({ entityType: "CHECKLIST", entityId: id, action: "EXCLUIDO", summary: `Checklist padrão "${tpl.name}" excluído`, userId: actor.id });
  revalidatePath("/", "layout");
  return { ok: true };
}
