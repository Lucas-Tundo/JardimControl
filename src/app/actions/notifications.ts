"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function unreadNotificationCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return db.notification.count({ where: { userId: user.id, read: false } });
}
