import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { readToken, SESSION_COOKIE } from "./session";

export type SessionUser = {
  id: string;
  name: string;
  login: string;
  role: "ADMIN" | "LIDER" | "JARDINEIRO";
  teamIds: string[];
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const uid = readToken(store.get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const user = await db.user.findUnique({
    where: { id: uid },
    include: { memberships: { select: { teamId: true } } },
  });
  if (!user || !user.active) return null;
  return {
    id: user.id,
    name: user.name,
    login: user.login,
    role: user.role as SessionUser["role"],
    teamIds: user.memberships.map((m) => m.teamId),
  };
});

export function isLeader(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "LIDER";
}

export function isAdmin(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireLeader(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isLeader(user)) redirect("/minhas-tarefas");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/painel");
  return user;
}

/** Filtro Prisma de tarefas visíveis para um jardineiro (dele ou de suas equipes). */
export function myTasksWhere(user: SessionUser) {
  return {
    deletedAt: null,
    OR: [{ assigneeUserId: user.id }, ...(user.teamIds.length ? [{ assigneeTeamId: { in: user.teamIds } }] : [])],
  };
}

export function canAccessTask(
  user: SessionUser,
  task: { assigneeUserId: string | null; assigneeTeamId: string | null },
): boolean {
  if (isLeader(user)) return true;
  return task.assigneeUserId === user.id || (!!task.assigneeTeamId && user.teamIds.includes(task.assigneeTeamId));
}
