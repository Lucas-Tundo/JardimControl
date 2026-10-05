"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRecurrence, toggleRecurrence } from "@/app/actions/recurrences";
import { MAINTENANCE_TYPES, PERIODICITIES } from "@/lib/constants";
import { dateKey } from "@/lib/dates";
import type { FormOptions } from "@/lib/queries";
import { ChecklistEditor, type EditableItem } from "./checklist-editor";
import { Dialog, ModalFooter, useConfirm } from "./dialog";
import { AssigneeSelect, LocationSelect, PrioritySelector } from "./task-form";
import { useToast } from "./toast";

export type RecurrenceInitial = {
  id?: string;
  title?: string;
  type?: string;
  priority?: string;
  locationId?: string;
  assignee?: string;
  frequency?: string;
  intervalDays?: number | null;
  startDate?: string;
  endDate?: string;
  timeOfDay?: string;
  durationHours?: number;
  instructions?: string;
  scheduleId?: string;
  checklistTemplateId?: string;
  checklist?: EditableItem[];
};

export function RecurrenceDialogButton({ options, initial, label, className = "btn-primary" }: { options: FormOptions; initial?: RecurrenceInitial; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnBackdrop={false}
        size="md"
        kicker="Recorrentes"
        title={initial?.id ? "Editar manutenção recorrente" : "Nova manutenção recorrente"}
        description={initial?.id ? "As próximas tarefas programadas são atualizadas ao salvar." : "As tarefas são geradas automaticamente conforme a periodicidade."}
      >
        {open && <RecurrenceForm options={options} initial={initial} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  );
}

function RecurrenceForm({ options, initial = {}, onDone }: { options: FormOptions; initial?: RecurrenceInitial; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [locationId, setLocationId] = useState(initial.locationId ?? "");
  const [assignee, setAssignee] = useState(initial.assignee ?? "");
  const [priority, setPriority] = useState(initial.priority ?? "MEDIA");
  const [frequency, setFrequency] = useState(initial.frequency ?? "QUINZENAL");
  const [checklist, setChecklist] = useState<EditableItem[]>(initial.checklist ?? []);
  const [type, setType] = useState(initial.type ?? "CORTE_GRAMA");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("checklist", JSON.stringify(checklist));
        start(async () => {
          const r = await saveRecurrence(initial.id ?? null, fd);
          if (!r.ok) return toast.show(r.error, "error");
          toast.show(r.message ?? "Salvo.");
          onDone();
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Título *</label>
          <input name="title" className="input" defaultValue={initial.title} placeholder="Ex.: Corte de grama · Gramado externo" required />
        </div>
        <div>
          <label className="label">Tipo de manutenção *</label>
          <select
            name="type"
            className="input"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              if (!checklist.length) {
                const tpl = options.templates.find((t) => t.type === e.target.value);
                if (tpl) setChecklist(tpl.items.map((i) => ({ ...i })));
              }
            }}
          >
            {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Local *</label>
          <LocationSelect options={options} value={locationId} onChange={setLocationId} />
          {locationId && <p className="mt-1 text-xs text-stone-500">Área: {options.locations.find((l) => l.id === locationId)?.area}</p>}
        </div>
        <div>
          <label className="label">Responsável *</label>
          <AssigneeSelect options={options} value={assignee} onChange={setAssignee} />
        </div>
        <div>
          <label className="label">Frequência *</label>
          <select name="frequency" className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {Object.entries(PERIODICITIES).filter(([k]) => k !== "UNICA").map(([k, v]) => (
              <option key={k} value={k}>{v}{k === "QUINZENAL" ? " (a cada 15 dias)" : ""}</option>
            ))}
          </select>
        </div>
        {frequency === "PERSONALIZADA" && (
          <div>
            <label className="label">A cada quantos dias? *</label>
            <input name="intervalDays" type="number" min={1} className="input" defaultValue={initial.intervalDays ?? 10} />
          </div>
        )}
        <div>
          <label className="label">Data inicial *</label>
          <input name="startDate" type="date" className="input" defaultValue={initial.startDate ?? dateKey(new Date())} required />
        </div>
        <div>
          <label className="label">Data final</label>
          <input name="endDate" type="date" className="input" defaultValue={initial.endDate} />
        </div>
        <div>
          <label className="label">Horário</label>
          <input name="timeOfDay" type="time" className="input" defaultValue={initial.timeOfDay ?? "08:00"} />
        </div>
        <div>
          <label className="label">Prazo (horas após o início)</label>
          <input name="durationHours" type="number" min={1} className="input" defaultValue={initial.durationHours ?? 9} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Prioridade</label>
          <PrioritySelector value={priority} onChange={setPriority} />
        </div>
        {options.schedules.length > 0 && (
          <div>
            <label className="label">Cronograma</label>
            <select name="scheduleId" className="input" defaultValue={initial.scheduleId ?? ""}>
              <option value="">Nenhum</option>
              {options.schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="label">Instruções</label>
          <textarea name="instructions" className="input min-h-16" defaultValue={initial.instructions} />
        </div>
      </div>
      <div>
        <p className="label">Checklist padrão</p>
        <ChecklistEditor items={checklist} onChange={setChecklist} templates={options.templates} />
      </div>
      <ModalFooter>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancelar
        </button>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Salvando…" : initial.id ? "Salvar e atualizar próximas tarefas" : "Criar e gerar tarefas"}
        </button>
      </ModalFooter>
    </form>
  );
}

export function ToggleRecurrenceButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <button
      className={active ? "btn-ghost text-[var(--ds-orange)]" : "btn-ghost text-brand-700"}
      disabled={pending}
      onClick={async () => {
        if (active && !(await confirm({ title: "Pausar esta recorrência?", description: "As tarefas futuras ainda programadas serão canceladas.", confirmLabel: "Pausar" }))) return;
        start(async () => {
          const r = await toggleRecurrence(id);
          if (!r.ok) return toast.show(r.error, "error");
          toast.show(active ? "Recorrência pausada." : "Recorrência reativada.");
          router.refresh();
        });
      }}
    >
      {active ? "Pausar" : "Reativar"}
    </button>
  );
}
