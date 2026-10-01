import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { isLeader, type SessionUser } from "@/lib/auth";
import { runSweep } from "@/lib/sweep";
import { GardenerShell, LeaderShell } from "./shells";

export async function RoleShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  await runSweep();
  const unread = await db.notification.count({ where: { userId: user.id, read: false } });
  if (!isLeader(user)) {
    return (
      <GardenerShell user={user} unread={unread}>
        {children}
      </GardenerShell>
    );
  }
  const [approvals, occurrences] = await Promise.all([
    db.task.count({ where: { deletedAt: null, status: "AGUARDANDO_APROVACAO" } }),
    db.occurrence.count({ where: { status: "ABERTA" } }),
  ]);
  return (
    <LeaderShell user={user} unread={unread} counts={{ approvals, occurrences }}>
      {children}
    </LeaderShell>
  );
}
