"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CircleCheck, Images, MapPin, Plus, X } from "lucide-react";
import { createTask } from "@/app/actions/tasks";
import { DEFAULT_CHECKLIST, MAINTENANCE_TYPES } from "@/lib/constants";
import { addDays, dateKey, formatDate, timeKey } from "@/lib/dates";
import { compressAll } from "@/lib/image-client";
import type { FormOptions } from "@/lib/queries";
import { AssigneeSelect, LocationSelect, PrioritySelector } from "./task-form";
import { TypeIcon } from "./icons";
import { useToast } from "./toast";

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card card-pad">
      <h3 className="mb-3 flex items-center gap-2.5 text-[17px] font-semibold text-stone-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold tabular-nums text-stone-600">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

const DEADLINES = [
  { label: "Hoje", days: 0 },
  { label: "Amanhã", days: 1 },
  { label: "3 dias", days: 3 },
  { label: "1 semana", days: 7 },
];

export function RondaFlow({ options, presetLocationId, title = "Registrar manutenção" }: { options: FormOptions; presetLocationId?: string; title?: string }) {
  const router = useRouter();
  const toast = useToast();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [step, setStep] = useState<"start" | "form" | "done">("start");
  const [locationId, setLocationId] = useState(presetLocationId ?? "");
  const [locSource, setLocSource] = useState<string>(presetLocationId ? "QR Code do local" : "");
  const [type, setType] = useState("");
  const [problem, setProblem] = useState("");
  const [priority, setPriority] = useState("ALTA");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState(dateKey(addDays(new Date(), 1)));
  const [notes, setNotes] = useState("");
  const [created, setCreated] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const urls = photos.map((p) => URL.createObjectURL(p));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  // Local sugerido automaticamente: responsável padrão e GPS
  useEffect(() => {
    if (step !== "form" || locationId || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let best: { id: string; d: number } | null = null;
        for (const l of options.locations) {
          if (l.latitude == null || l.longitude == null) continue;
          const d = distanceMeters(here, { lat: l.latitude, lng: l.longitude });
          if (!best || d < best.d) best = { id: l.id, d };
        }
        if (best && best.d <= 300) {
          setLocationId((cur) => cur || best!.id);
          setLocSource(`GPS, a cerca de ${Math.round(best.d)} m`);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [step, locationId, options.locations]);

  const onPhotos = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = await compressAll(list);
    setPhotos((p) => [...p, ...files]);
    setStep("form");
    if (camRef.current) camRef.current.value = "";
    if (galRef.current) galRef.current.value = "";
  };

  const reset = () => {
    setPhotos([]);
    setStep("start");
    setLocationId(presetLocationId ?? "");
    setLocSource(presetLocationId ? "QR Code do local" : "");
    setType("");
    setProblem("");
    setPriority("ALTA");
    setAssignee("");
    setNotes("");
    setCreated(null);
  };

  const submit = () => {
    const loc = options.locations.find((l) => l.id === locationId);
    if (!loc) return toast.show("Selecione o local.", "error");
    if (!type) return toast.show("Selecione o tipo de serviço.", "error");
    if (!problem.trim()) return toast.show("Descreva o problema.", "error");
    if (!assignee) return toast.show("Selecione o responsável.", "error");
    const now = new Date();
    const tpl = options.templates.find((t) => t.type === type);
    const fd = new FormData();
    fd.set("title", `${MAINTENANCE_TYPES[type as keyof typeof MAINTENANCE_TYPES].label} · ${loc.name}`);
    fd.set("type", type);
    fd.set("description", problem.trim());
    fd.set("instructions", notes.trim());
    fd.set("locationId", loc.id);
    fd.set("assignee", assignee);
    fd.set("priority", priority);
    fd.set("date", dateKey(now));
    fd.set("time", timeKey(now));
    fd.set("dueDate", due);
    fd.set("dueTime", "17:00");
    fd.set("periodicity", "UNICA");
    fd.set("origin", presetLocationId ? "QRCODE" : "RONDA");
    fd.set("checklist", JSON.stringify(tpl?.items ?? DEFAULT_CHECKLIST));
    photos.forEach((p) => fd.append("photos", p));
    start(async () => {
      const r = await createTask(fd);
      if (!r.ok) return toast.show(r.error, "error");
      setCreated({ id: r.data!.id });
      setStep("done");
      router.refresh();
    });
  };

  const inputs = (
    <>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhotos(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPhotos(e.target.files)} />
    </>
  );

  if (step === "start") {
    return (
      <div className="flex flex-col items-center gap-3">
        {inputs}
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          className="flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-[18px] bg-brand-700 px-6 py-8 text-white shadow-[var(--ds-shadow-2)] transition-colors hover:bg-brand-800"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <Camera className="h-7 w-7" aria-hidden />
          </span>
          <span className="text-[22px] font-semibold">{title}</span>
          <span className="text-sm text-white/75">Tire uma foto do local que precisa de manutenção</span>
        </button>
        <div className="flex flex-wrap justify-center gap-1">
          <button type="button" className="btn-ghost" onClick={() => galRef.current?.click()}>
            <Images /> Escolher da galeria
          </button>
          <button type="button" className="btn-ghost text-stone-600" onClick={() => setStep("form")}>
            Continuar sem foto
          </button>
        </div>
      </div>
    );
  }

  if (step === "done" && created) {
    return (
      <div className="card card-pad flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
          <CircleCheck className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="text-[22px] font-semibold text-stone-900">Tarefa criada</h2>
        <p className="max-w-sm text-sm text-stone-600">Ela já aparece no painel da liderança e na lista do responsável, que foi notificado.</p>
        <div className="mt-2 grid w-full max-w-sm gap-2.5">
          <button className="btn-xl btn-primary" onClick={reset}>
            <Plus /> Registrar outra
          </button>
          <Link className="btn-secondary min-h-12" href={`/tarefas/${created.id}`}>
            Ver tarefa criada
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inputs}
      <Step n={1} title="Foto do local">
        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((u, i) => (
              <div key={u} className="relative aspect-square overflow-hidden rounded-[10px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white" onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))} aria-label="Remover foto">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => camRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] bg-stone-50 text-brand-700 shadow-[inset_0_0_0_1px_var(--ds-separator-strong)] hover:bg-stone-100">
              <Plus className="h-5 w-5" aria-hidden />
              <span className="text-xs font-medium">Mais fotos</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => camRef.current?.click()} className="btn-xl btn-secondary">
            <Camera /> Tirar foto
          </button>
        )}
      </Step>

      <Step n={2} title="Local">
        <LocationSelect options={options} value={locationId} onChange={(v) => { setLocationId(v); setLocSource("Selecionado manualmente"); }} />
        {locationId && locSource && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> Identificado por {locSource}
          </p>
        )}
      </Step>

      <Step n={3} title="Problema">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setType(k)}
              aria-pressed={type === k}
              className="choice"
            >
              <TypeIcon type={k} /> {v.label}
            </button>
          ))}
        </div>
        <textarea className="input min-h-20" placeholder="Ex.: galhos avançando sobre a área de circulação" value={problem} onChange={(e) => setProblem(e.target.value)} />
      </Step>

      <Step n={4} title="Prioridade">
        <PrioritySelector value={priority} onChange={setPriority} />
      </Step>

      <Step n={5} title="Responsável">
        <AssigneeSelect options={options} value={assignee} onChange={setAssignee} />
      </Step>

      <Step n={6} title="Prazo">
        <div className="mb-2.5 grid grid-cols-4 gap-2">
          {DEADLINES.map((d) => {
            const v = dateKey(addDays(new Date(), d.days));
            return (
              <button key={d.label} type="button" onClick={() => setDue(v)} aria-pressed={due === v} className="choice justify-center px-2">
                {d.label}
              </button>
            );
          })}
        </div>
        <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        <p className="mt-1.5 text-xs text-stone-500">Prazo: {formatDate(new Date(`${due}T17:00:00-03:00`))} às 17:00</p>
      </Step>

      <Step n={7} title="Observações">
        <textarea className="input min-h-20" placeholder="Ex.: realizar a poda mantendo a copa da árvore equilibrada" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Step>

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <button type="button" className="btn-xl btn-primary shadow-[var(--ds-shadow-2)]" disabled={pending} onClick={submit}>
          {pending ? "Criando…" : "Criar tarefa"}
        </button>
      </div>
      <button type="button" className="btn-ghost w-full text-stone-600" onClick={reset}>
        Cancelar
      </button>
    </div>
  );
}
