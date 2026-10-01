import {
  Bell,
  Brush,
  Bug,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock,
  Construction,
  Droplets,
  FlaskConical,
  Flower2,
  Image,
  Leaf,
  Plus,
  Recycle,
  Scissors,
  Shrub,
  Sprout,
  TreeDeciduous,
  TriangleAlert,
  Undo2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { MaintenanceType, NotificationType, OccurrenceType } from "@/lib/constants";

export const TYPE_ICONS: Record<MaintenanceType, LucideIcon> = {
  CORTE_GRAMA: Sprout,
  PODA: Scissors,
  CAPINA: Leaf,
  IRRIGACAO: Droplets,
  PLANTIO: Flower2,
  ADUBACAO: FlaskConical,
  LIMPEZA: Brush,
  CONTROLE_PRAGAS: Bug,
  CANTEIROS: Shrub,
  RESIDUOS_VERDES: Recycle,
  OUTROS: Wrench,
};

export const OCCURRENCE_ICONS: Record<OccurrenceType, LucideIcon> = {
  ARVORE_DANIFICADA: TreeDeciduous,
  VAZAMENTO_IRRIGACAO: Droplets,
  PRAGA: Bug,
  EQUIPAMENTO_DANIFICADO: Wrench,
  AREA_INACESSIVEL: Construction,
  MANUTENCAO_ADICIONAL: Plus,
  OUTRO: CircleAlert,
};

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  NOVA_TAREFA: ClipboardList,
  PRAZO_PROXIMO: Clock,
  ATRASADA: TriangleAlert,
  CONCLUIDA: CircleCheck,
  DEVOLVIDA: Undo2,
  AGUARDANDO_APROVACAO: Bell,
  NOVA_OCORRENCIA: CircleAlert,
  MANUTENCAO_PROGRAMADA: CalendarClock,
  INSTRUCOES: Image,
};

export function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICONS[type as MaintenanceType] ?? Wrench;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden />;
}

export function OccurrenceIcon({ type, className }: { type: string; className?: string }) {
  const Icon = OCCURRENCE_ICONS[type as OccurrenceType] ?? CircleAlert;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden />;
}
