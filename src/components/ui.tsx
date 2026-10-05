import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Leaf, type LucideIcon } from "lucide-react";
import {
  MAINTENANCE_TYPES,
  OCCURRENCE_STATUS,
  OCCURRENCE_TYPES,
  PRIORITIES,
  TASK_STATUS,
  type MaintenanceType,
  type OccurrenceStatus,
  type OccurrenceType,
  type Priority,
  type TaskStatus,
} from "@/lib/constants";
import { OccurrenceIcon, TypeIcon } from "@/components/icons";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function StatusDot({ status, className }: { status: string; className?: string }) {
  const s = TASK_STATUS[status as TaskStatus] ?? TASK_STATUS.PENDENTE;
  return <span aria-hidden className={cn("inline-block h-2 w-2 shrink-0 rounded-full", s.dot, className)} />;
}

export function StatusBadge({ status, late, size = "sm" }: { status: string; late?: boolean; size?: "sm" | "lg" }) {
  const s = TASK_STATUS[status as TaskStatus] ?? TASK_STATUS.PENDENTE;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn("chip gap-1.5", s.badge, size === "lg" && "min-h-7 px-3 text-sm")}>
        <StatusDot status={status} />
        {s.label}
      </span>
      {late && status !== "ATRASADA" && <span className={cn("chip", TASK_STATUS.ATRASADA.badge, size === "lg" && "min-h-7 px-3 text-sm")}>Fora do prazo</span>}
    </span>
  );
}

export function PriorityBadge({ priority, size = "sm" }: { priority: string; size?: "sm" | "lg" }) {
  const p = PRIORITIES[priority as Priority] ?? PRIORITIES.MEDIA;
  return <span className={cn("chip", p.badge, size === "lg" && "min-h-7 px-3 text-sm")}>{p.label}</span>;
}

export function TypeLabel({ type, className }: { type: string; className?: string }) {
  const t = MAINTENANCE_TYPES[type as MaintenanceType] ?? MAINTENANCE_TYPES.OUTROS;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <TypeIcon type={type} className="h-4 w-4 shrink-0 text-brand-700" />
      {t.label}
    </span>
  );
}

export function OccurrenceTypeLabel({ type }: { type: string }) {
  const t = OCCURRENCE_TYPES[type as OccurrenceType] ?? OCCURRENCE_TYPES.OUTRO;
  return (
    <span className="inline-flex items-center gap-1.5">
      <OccurrenceIcon type={type} className="h-4 w-4 shrink-0 text-stone-500" />
      {t.label}
    </span>
  );
}

export function OccurrenceStatusBadge({ status }: { status: string }) {
  const s = OCCURRENCE_STATUS[status as OccurrenceStatus] ?? OCCURRENCE_STATUS.ABERTA;
  return <span className={cn("chip", s.badge)}>{s.label}</span>;
}

export function BackLink({ href, children = "Voltar" }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="-ml-1.5 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && <BackLink href={back} />}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="subtitle mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

const STAT_TONES = {
  green: "text-green-700",
  blue: "text-blue-600",
  yellow: "text-amber-600",
  orange: "text-orange-600",
  red: "text-red-600",
  cyan: "text-cyan-700",
  stone: "text-stone-500",
} as const;

/** Um cartão, uma resposta: número grande com a base logo abaixo (ex.: "de 15 no total"). */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "stone",
  href,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: keyof typeof STAT_TONES;
  href?: string;
}) {
  const body = (
    <div className={cn("card flex h-full flex-col justify-between gap-2 p-4", href && "transition-shadow duration-200 hover:shadow-md")}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug text-stone-600">{label}</span>
        {Icon && <Icon className={cn("h-[18px] w-[18px] shrink-0", STAT_TONES[tone])} aria-hidden />}
      </div>
      <div>
        <span className="block text-[28px] font-bold leading-8 tracking-tight tabular-nums text-stone-900">{value}</span>
        {hint && <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-[14px]">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ icon: Icon = Leaf, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] bg-white px-6 py-10 text-center shadow-[var(--ds-shadow-1)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 font-semibold text-stone-800">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function Section({ title, actions, children, className }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card card-pad min-w-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <h2 className="section-title">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-8 items-center rounded-lg px-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
      {children}
    </Link>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 text-sm text-stone-500">{label}</dt>
      <dd className="text-sm text-stone-900">{children}</dd>
    </div>
  );
}

export function ProgressBar({ value, total, className }: { value: number; total: number; className?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-stone-200", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-300", pct === 100 ? "bg-green-600" : "bg-brand-600")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", light ? "text-white" : "text-stone-900", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? "rgba(255,255,255,0.18)" : "#1f6b45"} />
        <path d="M16 25V13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 15c-5 0-8-3-8-8 5 0 8 3 8 8z" fill="#fff" fillOpacity="0.9" />
        <path d="M16 19c4.5 0 7.5-2.8 7.5-7.5-4.5 0-7.5 2.8-7.5 7.5z" fill="#fff" fillOpacity="0.65" />
      </svg>
      <span className="text-[17px] leading-none">Jardim Control</span>
    </span>
  );
}
