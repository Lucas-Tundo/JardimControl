"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Images, Play, Undo2 } from "lucide-react";
import { startTask } from "@/app/actions/execution";
import { MAINTENANCE_TYPES, type MaintenanceType } from "@/lib/constants";
import { formatTime, relativeDay } from "@/lib/dates";
import { Dialog } from "./dialog";
import { TypeIcon } from "./icons";
import { PhotoGallery, type PhotoView } from "./photos";
import { useToast } from "./toast";
import { PriorityBadge, StatusBadge, cn } from "./ui";

export type GardenerCardTask = {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  late: boolean;
  scheduledAt: Date;
  dueAt: Date;
  location: string;
  team?: string | null;
  returned?: string | null;
  checklistDone: number;
  checklistTotal: number;
  photos: PhotoView[];
};

export function GardenerTaskCard({ task }: { task: GardenerCardTask }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [photosOpen, setPhotosOpen] = useState(false);
  const t = MAINTENANCE_TYPES[task.type as MaintenanceType] ?? MAINTENANCE_TYPES.OUTROS;
  const canStart = ["PROGRAMADA", "PENDENTE", "ATRASADA"].includes(task.status);
  const inProgress = task.status === "EM_ANDAMENTO";
  const urgent = task.priority === "URGENTE" || task.priority === "ALTA";

  const begin = () =>
    start(async () => {
      const r = await startTask(task.id);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show(r.message ?? "Tarefa iniciada.");
      router.push(`/minhas-tarefas/${task.id}`);
    });

  return (
    <article className={cn("card overflow-hidden", task.late && "ring-1 ring-inset ring-red-200")}>
      <Link href={`/minhas-tarefas/${task.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-700">
            <TypeIcon type={task.type} className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[17px] font-semibold leading-6 text-stone-900">{t.label}</p>
              {urgent && <PriorityBadge priority={task.priority} />}
            </div>
            <p className="text-base font-medium text-stone-700">{task.location}</p>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-stone-500">{task.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={cn("font-semibold tabular-nums", task.late ? "text-red-700" : "text-stone-800")}>
            {relativeDay(task.scheduledAt)} · {formatTime(task.scheduledAt)}
          </span>
          <StatusBadge status={task.status} late={task.late} />
          {task.team && <span className="chip bg-stone-100 text-stone-600">{task.team}</span>}
          {task.checklistTotal > 0 && (
            <span className="chip bg-stone-100 tabular-nums text-stone-600">
              Checklist {task.checklistDone} de {task.checklistTotal}
            </span>
          )}
        </div>
        {task.returned && (
          <p className="mt-3 flex gap-2 rounded-[10px] bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <Undo2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">Devolvida para correção:</span> {task.returned}
            </span>
          </p>
        )}
      </Link>
      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        <button type="button" className="btn-secondary min-h-13 text-base" onClick={() => setPhotosOpen(true)}>
          <Images /> Fotos {task.photos.length > 0 && <span className="tabular-nums text-stone-500">{task.photos.length}</span>}
        </button>
        {canStart ? (
          <button type="button" className="btn-primary min-h-13 text-base" disabled={pending} onClick={begin}>
            {task.returned ? <Undo2 /> : <Play />}
            {pending ? "Iniciando…" : task.returned ? "Corrigir" : "Iniciar tarefa"}
          </button>
        ) : (
          <Link href={`/minhas-tarefas/${task.id}`} className={cn("min-h-13 text-base", inProgress ? "btn-warning" : "btn-secondary")}>
            {inProgress ? "Continuar" : "Abrir"} <ArrowRight />
          </Link>
        )}
      </div>
      <Dialog open={photosOpen} onClose={() => setPhotosOpen(false)} title={`Fotos · ${task.location}`} wide>
        <PhotoGallery photos={task.photos} emptyText="Nenhuma foto de referência para esta tarefa." columns="grid-cols-2 sm:grid-cols-3" />
      </Dialog>
    </article>
  );
}
