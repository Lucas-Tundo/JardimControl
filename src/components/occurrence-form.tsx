"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { createOccurrence, resolveOccurrence } from "@/app/actions/occurrences";
import { OCCURRENCE_TYPES } from "@/lib/constants";
import type { FormOptions } from "@/lib/queries";
import { Dialog } from "./dialog";
import { OccurrenceIcon } from "./icons";
import { PendingPhotos, PhotoPicker } from "./photos";
import { LocationSelect, PrioritySelector } from "./task-form";
import { useToast } from "./toast";
import { cn } from "./ui";

export function OccurrenceForm({
  options,
  presetLocationId,
  taskId,
  leader,
  redirectTo,
}: {
  options: FormOptions;
  presetLocationId?: string;
  taskId?: string;
  leader?: boolean;
  redirectTo: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [type, setType] = useState("");
  const [locationId, setLocationId] = useState(presetLocationId ?? "");
  const [priority, setPriority] = useState("MEDIA");
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const submit = () => {
    if (!type) return toast.show("Escolha o tipo de problema.", "error");
    if (!locationId) return toast.show("Selecione o local.", "error");
    if (description.trim().length < 3) return toast.show("Descreva o problema.", "error");
    const fd = new FormData();
    fd.set("type", type);
    fd.set("locationId", locationId);
    fd.set("priority", priority);
    fd.set("description", description);
    if (taskId) fd.set("taskId", taskId);
    if (responsible) fd.set("responsibleUserId", responsible);
    photos.forEach((p) => fd.append("photos", p));
    start(async () => {
      const r = await createOccurrence(fd);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show("Ocorrência registrada. A liderança foi avisada.");
      router.push(redirectTo);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <section className="card card-pad">
        <p className="label">Qual é o problema? *</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(OCCURRENCE_TYPES).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setType(k);
                if (k === "ARVORE_DANIFICADA" || k === "VAZAMENTO_IRRIGACAO") setPriority("ALTA");
              }}
              aria-pressed={type === k}
              className={cn(
                "flex min-h-14 items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-medium transition-colors",
                type === k ? "bg-brand-50 text-brand-900 shadow-[inset_0_0_0_1.5px_var(--ds-tint)]" : "bg-white text-stone-800 shadow-[inset_0_0_0_1px_var(--ds-separator-strong)] hover:bg-stone-50",
              )}
            >
              <OccurrenceIcon type={k} className={cn("h-5 w-5 shrink-0", type === k ? "text-brand-700" : "text-stone-500")} /> {v.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card card-pad space-y-3">
        <div>
          <p className="label">Foto</p>
          <PendingPhotos files={photos} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} />
          <div className="mt-2">
            <PhotoPicker onFiles={(f) => setPhotos((p) => [...p, ...f])} label="Tirar foto" className="btn-xl btn-secondary" />
          </div>
        </div>
        <div>
          <p className="label">Local *</p>
          <LocationSelect options={options} value={locationId} onChange={setLocationId} />
        </div>
        <div>
          <p className="label">Descrição *</p>
          <textarea className="input min-h-24" placeholder="Descreva o que você encontrou…" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <p className="label">Prioridade</p>
          <PrioritySelector value={priority} onChange={setPriority} />
        </div>
        {leader && (
          <div>
            <p className="label">Responsável pelo acompanhamento</p>
            <select className="input" value={responsible} onChange={(e) => setResponsible(e.target.value)}>
              <option value="">Liderança</option>
              {options.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <button type="button" className="btn-xl btn-primary" disabled={pending} onClick={submit}>
        <Send /> {pending ? "Enviando…" : "Registrar ocorrência"}
      </button>
    </div>
  );
}

export function ResolveOccurrenceButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button className="btn-secondary min-h-9 px-3 text-sm" onClick={() => setOpen(true)}>
        Encerrar
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Encerrar ocorrência">
        <p className="mb-2 text-sm text-stone-600">Use quando o problema foi resolvido sem necessidade de uma tarefa.</p>
        <textarea className="input min-h-20" placeholder="Como foi resolvido? (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button
          className="btn-primary mt-3 w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resolveOccurrence(id, notes);
              if (!r.ok) return toast.show(r.error, "error");
              toast.show(r.message ?? "Encerrada.");
              setOpen(false);
              router.refresh();
            })
          }
        >
          Encerrar ocorrência
        </button>
      </Dialog>
    </>
  );
}
