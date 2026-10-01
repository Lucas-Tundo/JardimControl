"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/constants";
import { formatDateTime, relativeDay } from "@/lib/dates";
import { NOTIFICATION_ICONS } from "./icons";
import { cn } from "./ui";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

const ICON_TONE: Partial<Record<NotificationType, string>> = {
  ATRASADA: "bg-red-50 text-red-600",
  DEVOLVIDA: "bg-amber-50 text-amber-700",
  CONCLUIDA: "bg-green-50 text-green-700",
  NOVA_OCORRENCIA: "bg-orange-50 text-orange-700",
  AGUARDANDO_APROVACAO: "bg-violet-50 text-violet-700",
};

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read).length;

  const open = (n: NotificationItem) =>
    start(async () => {
      if (!n.read) await markNotificationRead(n.id);
      if (n.link) router.push(n.link);
      else router.refresh();
    });

  return (
    <div className="space-y-3">
      <div className="flex min-h-10 items-center justify-between">
        <p className="text-sm text-stone-500">{unread > 0 ? (unread === 1 ? "1 não lida" : `${unread} não lidas`) : "Todas lidas"}</p>
        {unread > 0 && (
          <button type="button" className="btn-ghost text-sm" disabled={pending} onClick={() => start(() => markAllNotificationsRead())}>
            Marcar todas como lidas
          </button>
        )}
      </div>
      <ul className="card divide-y divide-stone-100 overflow-hidden">
        {items.map((n) => {
          const t = NOTIFICATION_TYPES[n.type as NotificationType];
          const Icon = NOTIFICATION_ICONS[n.type as NotificationType] ?? Bell;
          return (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} className={cn("flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-stone-50", !n.read && "bg-brand-50/60")}>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", ICON_TONE[n.type as NotificationType] ?? "bg-stone-100 text-stone-600")}>
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", n.read ? "font-medium text-stone-800" : "font-semibold text-stone-900")}>{n.title}</span>
                  <span className="block text-sm text-stone-600">{n.message}</span>
                  <span className="mt-0.5 block text-xs text-stone-500" title={formatDateTime(n.createdAt)}>
                    {t?.label ?? "Aviso"} · {relativeDay(n.createdAt)} {formatDateTime(n.createdAt).slice(11)}
                  </span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Não lida" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
