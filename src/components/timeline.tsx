import {
  Ban,
  Camera,
  CircleCheck,
  CircleDot,
  ClipboardList,
  FileText,
  ImageOff,
  Pencil,
  Play,
  QrCode,
  Send,
  Trash2,
  Undo2,
  CalendarClock,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { cn } from "./ui";

const ACTION_ICON: Record<string, { icon: LucideIcon; tone?: string }> = {
  CRIADA: { icon: ClipboardList },
  CRIADO: { icon: ClipboardList },
  ALTERADA: { icon: Pencil },
  ALTERADO: { icon: Pencil },
  REPROGRAMADA: { icon: CalendarClock },
  INICIADA: { icon: Play, tone: "text-orange-600" },
  RETOMADA: { icon: Play, tone: "text-orange-600" },
  OBSERVACAO: { icon: FileText },
  FOTO: { icon: Camera },
  FOTOS: { icon: Camera },
  FOTOS_REFERENCIA: { icon: Camera },
  FOTO_REMOVIDA: { icon: ImageOff },
  ENVIADA_APROVACAO: { icon: Send, tone: "text-cyan-700" },
  APROVADA: { icon: CircleCheck, tone: "text-green-700" },
  DEVOLVIDA: { icon: Undo2, tone: "text-amber-700" },
  CANCELADA: { icon: Ban, tone: "text-stone-500" },
  EXCLUIDA: { icon: Trash2, tone: "text-red-600" },
  EXCLUIDA_DEFINITIVAMENTE: { icon: Trash2, tone: "text-red-600" },
  CONVERTIDA: { icon: ArrowRight },
  RESOLVIDA: { icon: CircleCheck, tone: "text-green-700" },
  QR_REGERADO: { icon: QrCode },
};

export type TimelineEntry = { id: string; action: string; summary: string; createdAt: Date; user: { name: string } | null };

export function Timeline({ entries, empty = "Sem registros." }: { entries: TimelineEntry[]; empty?: string }) {
  if (!entries.length) return <p className="text-sm text-stone-500">{empty}</p>;
  return (
    <ol className="relative">
      {entries.map((e, i) => {
        const { icon: Icon, tone } = ACTION_ICON[e.action] ?? { icon: CircleDot };
        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < entries.length - 1 && <span className="absolute bottom-0 left-[13px] top-7 w-px bg-stone-200" aria-hidden />}
            <span className={cn("relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100", tone ?? "text-stone-600")}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm text-stone-900">{e.summary}</p>
              <p className="text-xs tabular-nums text-stone-500">
                {formatDateTime(e.createdAt)} · {e.user?.name ?? "Sistema"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
