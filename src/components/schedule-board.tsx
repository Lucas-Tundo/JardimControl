"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { rescheduleTask } from "@/app/actions/tasks";
import { MAINTENANCE_TYPES, PRIORITIES, TASK_STATUS, type MaintenanceType, type Priority, type TaskStatus } from "@/lib/constants";
import { dateKey, formatShortDate, formatTime, formatWeekdayShort } from "@/lib/dates";
import { useToast } from "./toast";
import { StatusDot, cn } from "./ui";

export type BoardTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  scheduledAt: Date;
  location: string;
  assignee: string;
};

const MOVABLE = ["PROGRAMADA", "PENDENTE", "ATRASADA"];
let lastDragEnd = 0;

function TaskChip({ task, compact, readOnly }: { task: BoardTask; compact?: boolean; readOnly?: boolean }) {
  const movable = !readOnly && MOVABLE.includes(task.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !movable });
  const t = MAINTENANCE_TYPES[task.type as MaintenanceType];
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative rounded-md bg-white px-1.5 py-1 text-xs leading-tight shadow-[var(--ds-shadow-1)]",
        movable ? "cursor-grab touch-none active:cursor-grabbing" : "opacity-80",
        isDragging && "z-50 shadow-[var(--ds-shadow-3)] ring-2 ring-brand-600",
      )}
      title={`${task.title}\n${task.location} · ${task.assignee}\n${TASK_STATUS[task.status as TaskStatus]?.label}${movable ? "\nArraste para outra data" : ""}`}
    >
      <Link
        href={`/tarefas/${task.id}`}
        className="block"
        draggable={false}
        onClick={(e) => {
          if (Date.now() - lastDragEnd < 400) e.preventDefault();
        }}
      >
        <span className="flex items-center gap-1.5 font-medium text-stone-900">
          <StatusDot status={task.status} className="h-1.5 w-1.5" />
          <span className="truncate">{t?.label ?? task.type}</span>
          {task.priority === "URGENTE" || task.priority === "ALTA" ? <span className={cn("ml-auto h-2 w-2 shrink-0 rounded-full", PRIORITIES[task.priority as Priority].bar)} /> : null}
        </span>
        <span className="block truncate pl-3 text-stone-500">{task.location}</span>
        {!compact && (
          <span className="block truncate pl-3 tabular-nums text-stone-500">
            {formatTime(task.scheduledAt)} · {task.assignee}
          </span>
        )}
      </Link>
    </div>
  );
}

function DayCell({ day, tasks, inMonth = true, compact, readOnly, onNew }: { day: Date; tasks: BoardTask[]; inMonth?: boolean; compact?: boolean; readOnly?: boolean; onNew?: string }) {
  const key = dateKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: key, disabled: readOnly });
  const today = key === dateKey(new Date());
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-0 flex-col rounded-[10px] p-1.5 transition-colors",
        compact ? "min-h-28" : "min-h-72",
        today ? "bg-brand-50" : "bg-stone-100/70",
        !inMonth && "opacity-45",
        isOver && "bg-brand-100 ring-2 ring-inset ring-brand-600",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <Link href={`/cronograma?view=dia&data=${key}`} className={cn("text-xs hover:underline", today ? "font-semibold text-brand-800" : "font-medium text-stone-500")}>
          {compact ? Number(key.slice(8)) : `${formatWeekdayShort(day)} ${formatShortDate(day)}`}
        </Link>
        {!readOnly && onNew && (
          <Link href={`${onNew}${key}`} className="flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-white hover:text-brand-700" title="Nova tarefa nesta data" aria-label="Nova tarefa nesta data">
            <Plus className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {tasks.slice(0, compact ? 3 : 50).map((t) => (
          <TaskChip key={t.id} task={t} compact={compact} readOnly={readOnly} />
        ))}
        {compact && tasks.length > 3 && (
          <Link href={`/cronograma?view=dia&data=${key}`} className="px-1 text-xs font-medium text-brand-700 hover:underline">
            Mais {tasks.length - 3}
          </Link>
        )}
      </div>
    </div>
  );
}

export function ScheduleBoard({ tasks: initial, days, mode, month, readOnly }: { tasks: BoardTask[]; days: Date[]; mode: "semana" | "mes"; month?: string; readOnly?: boolean }) {
  const [tasks, setTasks] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  useEffect(() => setTasks(initial), [initial]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }));

  const onDragEnd = (e: DragEndEvent) => {
    lastDragEnd = Date.now();
    const target = e.over?.id as string | undefined;
    const id = e.active.id as string;
    const task = tasks.find((t) => t.id === id);
    if (!target || !task || dateKey(task.scheduledAt) === target) return;
    const [h, m] = formatTime(task.scheduledAt).split(":");
    const moved = new Date(`${target}T${h}:${m}:00-03:00`);
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, scheduledAt: moved } : t)));
    start(async () => {
      const r = await rescheduleTask(id, target);
      if (!r.ok) {
        toast.show(r.error, "error");
        setTasks(initial);
        return;
      }
      toast.show(`Tarefa movida para ${formatShortDate(moved)}.`);
      router.refresh();
    });
  };

  const byDay = (d: Date) => tasks.filter((t) => dateKey(t.scheduledAt) === dateKey(d)).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return (
    <DndContext id="schedule-board" sensors={sensors} onDragEnd={onDragEnd}>
      {pending && <p className="mb-2 text-xs text-stone-500">Salvando reorganização…</p>}
      {mode === "mes" && (
        <div className="mb-1 hidden grid-cols-7 gap-1.5 text-center text-xs text-stone-500 md:grid">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}
      <div className={cn("grid gap-1.5", mode === "semana" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7" : "grid-cols-2 sm:grid-cols-4 md:grid-cols-7")}>
        {days.map((d) => (
          <DayCell key={dateKey(d)} day={d} tasks={byDay(d)} compact={mode === "mes"} inMonth={!month || dateKey(d).startsWith(month)} readOnly={readOnly} onNew="/tarefas/nova?data=" />
        ))}
      </div>
    </DndContext>
  );
}
