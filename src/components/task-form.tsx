"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createTask, updateTask } from "@/app/actions/tasks";
import { MAINTENANCE_TYPES, PERIODICITIES, PRIORITIES, type Priority } from "@/lib/constants";
import type { FormOptions } from "@/lib/queries";
import { ChecklistEditor, type EditableItem } from "./checklist-editor";
import { PendingPhotos, PhotoPicker } from "./photos";
import { TypeIcon } from "./icons";
import { useToast } from "./toast";
import { cn } from "./ui";

export type TaskFormInitial = {
  title?: string;
  description?: string;
  instructions?: string;
  locationId?: string;
  assignee?: string;
  date?: string;
  time?: string;
  dueDate?: string;
  dueTime?: string;
  type?: string;
  priority?: string;
  periodicity?: string;
  scheduleId?: string;
  checklist?: EditableItem[];
};

export function PrioritySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Prioridade">
      {(Object.keys(PRIORITIES) as Priority[]).map((p) => (
        <label key={p}>
          <input type="radio" name="priority" value={p} checked={value === p} onChange={() => onChange(p)} className="sr-only" />
          <span className="choice justify-center gap-1.5 px-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITIES[p].bar)} aria-hidden />
            {PRIORITIES[p].label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function AssigneeSelect({ options, value, onChange, name = "assignee", required = true }: { options: FormOptions; value: string; onChange: (v: string) => void; name?: string; required?: boolean }) {
  return (
    <select name={name} className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">Selecione…</option>
      <optgroup label="Equipes">
        {options.teams.map((t) => (
          <option key={t.id} value={`team:${t.id}`}>
            {t.name} ({t.members} membros)
          </option>
        ))}
      </optgroup>
      <optgroup label="Jardineiros">
        {options.users.map((u) => (
          <option key={u.id} value={`user:${u.id}`}>
            {u.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

export function LocationSelect({ options, value, onChange, name = "locationId" }: { options: FormOptions; value: string; onChange: (v: string) => void; name?: string }) {
  const groups = useMemo(() => {
    const m = new Map<string, FormOptions["locations"]>();
    for (const l of options.locations) m.set(l.area, [...(m.get(l.area) ?? []), l]);
    return [...m.entries()];
  }, [options.locations]);
  return (
    <select name={name} className="input" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Selecione o local…</option>
      {groups.map(([area, locs]) => (
        <optgroup key={area} label={area}>
          {locs.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.code})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function TaskForm({
  options,
  initial = {},
  taskId,
  origin = "MANUAL",
  occurrenceId,
  existingPhotos = 0,
}: {
  options: FormOptions;
  initial?: TaskFormInitial;
  taskId?: string;
  origin?: string;
  occurrenceId?: string;
  existingPhotos?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [locationId, setLocationId] = useState(initial.locationId ?? "");
  const [assignee, setAssignee] = useState(initial.assignee ?? "");
  const [priority, setPriority] = useState(initial.priority ?? "MEDIA");
  const [periodicity, setPeriodicity] = useState(initial.periodicity ?? "UNICA");
  const [type, setType] = useState(initial.type ?? "");
  const [checklist, setChecklist] = useState<EditableItem[]>(initial.checklist ?? []);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const location = options.locations.find((l) => l.id === locationId);
  const editing = !!taskId;

  const suggestTemplate = (t: string) => {
    setType(t);
    if (checklist.length === 0) {
      const tpl = options.templates.find((x) => x.type === t);
      if (tpl) setChecklist(tpl.items.map((i) => ({ ...i })));
    }
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("checklist", JSON.stringify(checklist));
    fd.set("origin", origin);
    if (occurrenceId) fd.set("occurrenceId", occurrenceId);
    fd.delete("photos");
    photos.forEach((p) => fd.append("photos", p));
    start(async () => {
      const r = editing ? await updateTask(taskId!, fd) : await createTask(fd);
      if (!r.ok) {
        setError(r.error);
        toast.show(r.error, "error");
        return;
      }
      toast.show(r.message ?? "Salvo.");
      router.push(`/tarefas/${r.data!.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <section className="card card-pad space-y-4">
          <h2 className="section-title">O que precisa ser feito</h2>
          <div>
            <label className="label" htmlFor="title">Título *</label>
            <input id="title" name="title" className="input" defaultValue={initial.title} placeholder="Ex.: Poda das árvores do estacionamento" required minLength={3} />
          </div>
          <div>
            <label className="label">Tipo de manutenção *</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
                <label key={k}>
                  <input type="radio" name="type" value={k} checked={type === k} onChange={() => suggestTemplate(k)} className="sr-only" required />
                  <span className="choice">
                    <TypeIcon type={k} /> {v.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {(initial.description || origin !== "MANUAL") && (
            <div>
              <label className="label" htmlFor="description">Problema identificado</label>
              <textarea id="description" name="description" className="input min-h-20" defaultValue={initial.description} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="instructions">Instruções para o jardineiro</label>
            <textarea id="instructions" name="instructions" className="input min-h-28" defaultValue={initial.instructions} placeholder="Descreva como o serviço deve ser feito, cuidados, materiais…" />
          </div>
        </section>

        <section className="card card-pad space-y-4">
          <h2 className="section-title">Onde</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Local *</label>
              <LocationSelect options={options} value={locationId} onChange={setLocationId} />
            </div>
            <div>
              <label className="label">Área</label>
              <input className="input bg-stone-50 text-stone-600" value={location?.area ?? ""} placeholder="Definida pelo local" readOnly />
            </div>
          </div>
        </section>

        <section className="card card-pad space-y-3">
          <h2 className="section-title">Checklist</h2>
          <ChecklistEditor items={checklist} onChange={setChecklist} templates={options.templates} />
        </section>

        <section className="card card-pad space-y-3">
          <h2 className="section-title">Fotos de referência (antes)</h2>
          {existingPhotos > 0 && <p className="text-sm text-stone-500">Esta tarefa já tem {existingPhotos === 1 ? "1 foto" : `${existingPhotos} fotos`}. As novas serão adicionadas.</p>}
          <PendingPhotos files={photos} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} />
          <div className="max-w-xs">
            <PhotoPicker onFiles={(f) => setPhotos((p) => [...p, ...f])} label="Adicionar fotos" />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="card card-pad space-y-4 lg:sticky lg:top-20">
          <h2 className="section-title">Quem e quando</h2>
          <div>
            <label className="label">Responsável *</label>
            <AssigneeSelect options={options} value={assignee} onChange={setAssignee} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="label" htmlFor="date">Data *</label>
              <input id="date" name="date" type="date" className="input" defaultValue={initial.date} required />
            </div>
            <div>
              <label className="label" htmlFor="time">Horário</label>
              <input id="time" name="time" type="time" className="input" defaultValue={initial.time ?? "08:00"} />
            </div>
            <div>
              <label className="label" htmlFor="dueDate">Prazo *</label>
              <input id="dueDate" name="dueDate" type="date" className="input" defaultValue={initial.dueDate} required />
            </div>
            <div>
              <label className="label" htmlFor="dueTime">Até</label>
              <input id="dueTime" name="dueTime" type="time" className="input" defaultValue={initial.dueTime ?? "17:00"} />
            </div>
          </div>
          <div>
            <label className="label">Prioridade</label>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>
          {!editing ? (
            <div>
              <label className="label" htmlFor="periodicity">Periodicidade</label>
              <select id="periodicity" name="periodicity" className="input" value={periodicity} onChange={(e) => setPeriodicity(e.target.value)}>
                {Object.entries(PERIODICITIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {periodicity !== "UNICA" && (
                <div className="mt-2.5 grid grid-cols-2 gap-2.5 rounded-[10px] bg-stone-50 p-3">
                  {periodicity === "PERSONALIZADA" && (
                    <div>
                      <label className="label" htmlFor="intervalDays">A cada (dias) *</label>
                      <input id="intervalDays" name="intervalDays" type="number" min={1} className="input" defaultValue={10} />
                    </div>
                  )}
                  <div className={periodicity === "PERSONALIZADA" ? "" : "col-span-2"}>
                    <label className="label" htmlFor="recurrenceEnd">Repetir até</label>
                    <input id="recurrenceEnd" name="recurrenceEnd" type="date" className="input" />
                  </div>
                  <p className="col-span-2 text-xs text-stone-600">As próximas tarefas serão geradas automaticamente conforme a periodicidade.</p>
                </div>
              )}
            </div>
          ) : (
            <input type="hidden" name="periodicity" value={initial.periodicity ?? "UNICA"} />
          )}
          {options.schedules.length > 0 && (
            <div>
              <label className="label" htmlFor="scheduleId">Cronograma</label>
              <select id="scheduleId" name="scheduleId" className="input" defaultValue={initial.scheduleId ?? ""}>
                <option value="">Nenhum</option>
                {options.schedules.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="rounded-[10px] bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
          <button className="btn-primary min-h-12 w-full text-base" disabled={pending}>
            {pending ? "Salvando…" : editing ? "Salvar alterações" : "Criar tarefa"}
          </button>
        </section>
      </div>
    </form>
  );
}
