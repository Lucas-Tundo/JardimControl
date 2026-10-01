"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Play } from "lucide-react";
import { startTask } from "@/app/actions/execution";
import { MAINTENANCE_TYPES, type MaintenanceType } from "@/lib/constants";
import { formatTime, relativeDay } from "@/lib/dates";
import { TypeIcon } from "./icons";
import { useToast } from "./toast";
import { PriorityBadge, StatusBadge, cn } from "./ui";

export type PickerTask = {
  id: string;
  type: string;
  title: string;
  priority: string;
  status: string;
  late: boolean;
  scheduledAt: Date;
  checklist: { text: string; required: boolean; done: boolean }[];
};

export function QrTaskPicker({ tasks }: { tasks: PickerTask[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(tasks[0]?.id ?? "");
  const task = tasks.find((t) => t.id === selected);

  const go = () => {
    if (!task) return;
    start(async () => {
      if (task.status !== "EM_ANDAMENTO") {
        const r = await startTask(task.id);
        if (!r.ok) return toast.show(r.error, "error");
        toast.show(r.message ?? "Manutenção iniciada.");
      }
      router.push(`/minhas-tarefas/${task.id}`);
    });
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2" role="radiogroup" aria-label="Tarefas deste local">
        {tasks.map((t) => {
          const type = MAINTENANCE_TYPES[t.type as MaintenanceType] ?? MAINTENANCE_TYPES.OUTROS;
          const active = t.id === selected;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(t.id)}
                className={cn(
                  "w-full rounded-[14px] bg-white p-3.5 text-left transition-shadow",
                  active ? "shadow-[inset_0_0_0_2px_var(--ds-tint)]" : "shadow-[var(--ds-shadow-1)] hover:shadow-[var(--ds-shadow-2)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2.5 text-[17px] font-semibold text-stone-900">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", active ? "bg-brand-700 text-white" : "shadow-[inset_0_0_0_1.5px_rgba(60,60,67,0.3)]")}>
                      {active && <Check className="h-4 w-4" strokeWidth={2.5} />}
                    </span>
                    <TypeIcon type={t.type} className="h-5 w-5 text-brand-700" />
                    {type.label}
                  </span>
                  <PriorityBadge priority={t.priority} />
                </div>
                <p className="mt-1 pl-[34px] text-sm text-stone-600">{t.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-[34px] text-xs tabular-nums text-stone-500">
                  {relativeDay(t.scheduledAt)} · {formatTime(t.scheduledAt)}
                  <StatusBadge status={t.status} late={t.late} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {task && task.checklist.length > 0 && (
        <div className="card card-pad">
          <p className="mb-2 section-title">Checklist</p>
          <ul className="space-y-1.5">
            {task.checklist.map((c, i) => (
              <li key={i} className="flex items-center gap-2.5 text-base text-stone-800">
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md", c.done ? "bg-green-600 text-white" : "shadow-[inset_0_0_0_1.5px_rgba(60,60,67,0.3)]")}>
                  {c.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="flex-1">{c.text}</span>
                {c.required && <span className="text-xs text-red-600">Obrigatório</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn-xl btn-primary" disabled={!task || pending} onClick={go}>
        {task?.status === "EM_ANDAMENTO" ? <ArrowRight /> : <Play />}
        {pending ? "Abrindo…" : task?.status === "EM_ANDAMENTO" ? "Continuar manutenção" : "Iniciar manutenção"}
      </button>
    </div>
  );
}
