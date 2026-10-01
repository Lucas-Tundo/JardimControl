import { Bell } from "lucide-react";
import { AutoRefresh } from "@/components/auto-refresh";
import { NotificationList } from "@/components/notification-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { isLeader, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Notificações" };

/** Ajusta links gravados para a área correta do perfil que está lendo. */
function linkFor(link: string | null, leader: boolean): string | null {
  if (!link) return null;
  if (leader) {
    if (link.startsWith("/minhas-tarefas/")) return link.replace("/minhas-tarefas/", "/tarefas/");
    if (link === "/minhas-tarefas" || link === "/agenda") return "/cronograma";
    return link;
  }
  if (link.startsWith("/tarefas/")) return link.replace("/tarefas/", "/minhas-tarefas/");
  if (link.startsWith("/ocorrencias")) return "/minhas-tarefas";
  return link;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const leader = isLeader(user);
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefresh seconds={30} />
      <PageHeader title="Notificações" subtitle="Avisos de tarefas, prazos, aprovações e ocorrências" />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação por enquanto">Avisos de prazos, aprovações e ocorrências aparecem aqui.</EmptyState>
      ) : (
        <NotificationList
          items={items.map((n) => ({ id: n.id, type: n.type, title: n.title, message: n.message, link: linkFor(n.link, leader), read: n.read, createdAt: n.createdAt }))}
        />
      )}
    </div>
  );
}
