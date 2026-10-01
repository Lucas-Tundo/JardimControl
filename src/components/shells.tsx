"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  ChartColumn,
  CircleCheck,
  ClipboardList,
  History,
  House,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  MapPin,
  Menu,
  Repeat,
  ScanLine,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { Logo, cn } from "./ui";
import { logout } from "@/app/actions/auth";
import { ROLES, type Role } from "@/lib/constants";

type ShellUser = { name: string; role: string };

const SIDEBAR_BG = { background: "linear-gradient(180deg, var(--ds-brand) 0%, var(--ds-tint-deep) 100%)" };

const LEADER_NAV = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/ronda", label: "Ronda de jardinagem", icon: Camera },
  { href: "/tarefas", label: "Tarefas", icon: ClipboardList },
  { href: "/aprovacoes", label: "Aprovações", icon: BadgeCheck, badge: "approvals" as const },
  { href: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { href: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { href: "/locais", label: "Áreas, locais e QR", icon: MapPin },
  { href: "/mapa", label: "Planta da empresa", icon: Map },
  { href: "/ocorrencias", label: "Ocorrências", icon: TriangleAlert, badge: "occurrences" as const },
  { href: "/relatorios", label: "Relatórios", icon: ChartColumn },
  { href: "/checklists", label: "Checklists padrão", icon: ListChecks },
  { href: "/equipe", label: "Equipe e usuários", icon: Users },
  { href: "/auditoria", label: "Rastreabilidade", icon: History },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

function UserBox({ user, light }: { user: ShellUser; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold", light ? "bg-white/18 text-white" : "bg-brand-50 text-brand-800")}>
        {initials(user.name)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className={cn("truncate text-sm font-semibold", light ? "text-white" : "text-stone-900")}>{user.name}</p>
        <p className={cn("text-xs", light ? "text-white/70" : "text-stone-500")}>{ROLES[user.role as Role]}</p>
      </div>
    </div>
  );
}

function BellLink({ unread, light }: { unread: number; light?: boolean }) {
  return (
    <Link
      href="/notificacoes"
      className={cn("relative flex h-11 w-11 items-center justify-center rounded-full transition-colors", light ? "text-white hover:bg-white/10" : "text-stone-600 hover:bg-stone-100")}
      aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
    >
      <Bell className="h-[22px] w-[22px]" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

function SidebarFooter({ user }: { user: ShellUser }) {
  return (
    <div className="mt-4 border-t border-white/15 pt-4">
      <UserBox user={user} light />
      <form action={logout} className="mt-3">
        <button className="flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </form>
    </div>
  );
}

export function LeaderShell({
  user,
  unread,
  counts,
  children,
}: {
  user: ShellUser;
  unread: number;
  counts: { approvals: number; occurrences: number };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Menu principal">
      {LEADER_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const badge = item.badge ? counts[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors duration-150",
              active ? "bg-white/18 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{item.label}</span>
            {badge > 0 && <span className="min-w-6 rounded-full bg-white/20 px-1.5 text-center text-xs font-semibold tabular-nums text-white">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:pl-60 print:pl-0">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col p-3 lg:flex [&_:focus-visible]:outline-white" style={SIDEBAR_BG}>
        <Link href="/painel" className="mb-5 rounded-lg px-2 py-2">
          <Logo light />
        </Link>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">{nav}</div>
        <SidebarFooter user={user} />
      </aside>

      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-stone-200 bg-white/85 px-4 backdrop-blur-md lg:px-8">
        <div className="flex items-center gap-1 lg:hidden">
          <button onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-[10px] text-stone-700 hover:bg-stone-100" aria-label="Abrir menu">
            <Menu className="h-[22px] w-[22px]" />
          </button>
          <Link href="/painel">
            <Logo />
          </Link>
        </div>
        <div className="hidden text-sm text-stone-500 lg:block">Gestão da jardinagem</div>
        <div className="flex items-center gap-2">
          <Link href="/ronda" className="btn-primary hidden sm:inline-flex">
            <Camera /> Registrar manutenção
          </Link>
          <BellLink unread={unread} />
          <div className="hidden md:block lg:hidden">
            <UserBox user={user} />
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[var(--ds-scrim)]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col p-3 [&_:focus-visible]:outline-white" style={SIDEBAR_BG} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="mb-4 flex items-center justify-between pl-2">
              <Logo light />
              <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white hover:bg-white/10" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            <SidebarFooter user={user} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 lg:px-8 lg:pb-10">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Atalhos">
        {[
          { href: "/painel", label: "Painel", icon: LayoutDashboard },
          { href: "/tarefas", label: "Tarefas", icon: ClipboardList },
          { href: "/ronda", label: "Ronda", icon: Camera },
          { href: "/aprovacoes", label: "Aprovar", icon: BadgeCheck },
          { href: "/mapa", label: "Mapa", icon: Map },
        ].map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-brand-700" : "text-stone-500")}>
              <Icon className="h-[22px] w-[22px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const GARDENER_NAV = [
  { href: "/minhas-tarefas", label: "Tarefas", icon: House },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/escanear", label: "Ler QR", icon: ScanLine },
  { href: "/ocorrencia/nova", label: "Problema", icon: TriangleAlert },
  { href: "/concluidas", label: "Feitas", icon: CircleCheck },
];

export function GardenerShell({ user, unread, children }: { user: ShellUser; unread: number; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 text-white [&_:focus-visible]:outline-white" style={SIDEBAR_BG}>
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/minhas-tarefas">
            <Logo light />
          </Link>
          <div className="flex items-center">
            <BellLink unread={unread} light />
            <form action={logout}>
              <button className="flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10" aria-label="Sair">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-5">
        <p className="mb-3 text-sm text-stone-500">
          Olá, <span className="font-semibold text-stone-800">{user.name.split(" ")[0]}</span>
        </p>
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" aria-label="Navegação">
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {GARDENER_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold", active ? "text-brand-700" : "text-stone-500")}>
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-colors", active && "bg-brand-50")}>
                  <Icon className="h-6 w-6" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
