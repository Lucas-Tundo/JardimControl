import type { Prisma, PrismaClient } from "@prisma/client";
import type { NotificationType } from "./constants";
import { db } from "./db";

type Client = PrismaClient | Prisma.TransactionClient;

export type NotifyInput = {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  taskId?: string;
};

export async function notifyUsers(userIds: string[], input: NotifyInput, client: Client = db, exceptUserId?: string) {
  const ids = [...new Set(userIds)].filter((id) => id && id !== exceptUserId);
  if (!ids.length) return;
  await client.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      taskId: input.taskId ?? null,
    })),
  });
}

export async function leaderIds(client: Client = db): Promise<string[]> {
  const leaders = await client.user.findMany({
    where: { active: true, role: { in: ["ADMIN", "LIDER"] } },
    select: { id: true },
  });
  return leaders.map((l) => l.id);
}

/** Jardineiros que devem receber a tarefa: o responsável direto ou todos os membros da equipe. */
export async function taskRecipientIds(
  task: { assigneeUserId: string | null; assigneeTeamId: string | null },
  client: Client = db,
): Promise<string[]> {
  if (task.assigneeUserId) return [task.assigneeUserId];
  if (task.assigneeTeamId) {
    const members = await client.teamMember.findMany({
      where: { teamId: task.assigneeTeamId, user: { active: true } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }
  return [];
}

export async function notifyLeaders(input: NotifyInput, client: Client = db, exceptUserId?: string) {
  await notifyUsers(await leaderIds(client), input, client, exceptUserId);
}

export async function notifyTaskAssignees(
  task: { assigneeUserId: string | null; assigneeTeamId: string | null },
  input: NotifyInput,
  client: Client = db,
  exceptUserId?: string,
) {
  await notifyUsers(await taskRecipientIds(task, client), input, client, exceptUserId);
}
