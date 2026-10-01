"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Camera, Check, Images, MapPin, Play, Send, Timer, TriangleAlert, Undo2 } from "lucide-react";
import { saveExecutionNotes, startTask, submitForApproval, toggleChecklistItem, uploadExecutionPhotos } from "@/app/actions/execution";
import { MAINTENANCE_TYPES, type MaintenanceType } from "@/lib/constants";
import { formatDateTime, formatDuration, formatTime } from "@/lib/dates";
import { compressAll } from "@/lib/image-client";
import { TypeIcon } from "./icons";
import { PhotoGallery, type PhotoView } from "./photos";
import { useToast } from "./toast";
import { PriorityBadge, StatusBadge, cn } from "./ui";

export type ExecutionTask = {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  late: boolean;
  location: { id: string; name: string; area: string };
  description: string | null;
  instructions: string | null;
  scheduledAt: Date;
  dueAt: Date;
  startedAt: Date | null;
  sessionStartedAt: Date | null;
  previousMinutes: number;
  returned: string | null;
  notes: string;
  checklist: { id: string; text: string; required: boolean; done: boolean }[];
  referencePhotos: PhotoView[];
  duringPhotos: PhotoView[];
  afterPhotos: PhotoView[];
  myPhotoIds: string[];
};

function Elapsed({ since, previous }: { since: Date; previous: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const minutes = previous + Math.max(0, Math.round((now - since.getTime()) / 60000));
  return <>{minutes > 0 ? formatDuration(minutes) : "0min"}</>;
}

function Step({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="card card-pad">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-[17px] font-semibold text-stone-900">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold tabular-nums text-stone-600">{n}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function ExecutionView({ task }: { task: ExecutionTask }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<"" | "DURANTE" | "DEPOIS">("");
  const [checklist, setChecklist] = useState(task.checklist);
  const [notes, setNotes] = useState(task.notes);
  const [notesSaved, setNotesSaved] = useState(true);
  const afterRef = useRef<HTMLInputElement>(null);
  const duringRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [galleryStage, setGalleryStage] = useState<"DURANTE" | "DEPOIS">("DEPOIS");

  useEffect(() => setChecklist(task.checklist), [task.checklist]);

  const t = MAINTENANCE_TYPES[task.type as MaintenanceType] ?? MAINTENANCE_TYPES.OUTROS;
  const running = task.status === "EM_ANDAMENTO";
  const canStart = ["PROGRAMADA", "PENDENTE", "ATRASADA"].includes(task.status);
  const pendingRequired = checklist.filter((c) => c.required && !c.done);
  const doneCount = checklist.filter((c) => c.done).length;
  const missingAfter = task.afterPhotos.length === 0;
  const canSubmit = running && pendingRequired.length === 0 && !missingAfter;

  const begin = () =>
    start(async () => {
      const r = await startTask(task.id);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show(r.message ?? "Tarefa iniciada.");
      router.refresh();
    });

  const toggle = (id: string, done: boolean) => {
    if (!running) return toast.show("Inicie a tarefa para marcar o checklist.", "info");
    setChecklist((list) => list.map((c) => (c.id === id ? { ...c, done } : c)));
    start(async () => {
      const r = await toggleChecklistItem(id, done);
      if (!r.ok) {
        toast.show(r.error, "error");
        setChecklist(task.checklist);
      }
    });
  };

  const saveNotes = () => {
    if (notesSaved) return;
    start(async () => {
      const r = await saveExecutionNotes(task.id, notes);
      if (!r.ok) return toast.show(r.error, "error");
      setNotesSaved(true);
    });
  };

  const upload = async (stage: "DURANTE" | "DEPOIS", list: FileList | null) => {
    if (!list?.length) return;
    setUploading(stage);
    try {
      const files = await compressAll(list);
      const fd = new FormData();
      files.forEach((f) => fd.append("photos", f));
      const r = await uploadExecutionPhotos(task.id, stage, fd);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show(stage === "DEPOIS" ? "Foto final registrada." : "Foto registrada.");
      router.refresh();
    } finally {
      setUploading("");
      [afterRef, duringRef, galleryRef].forEach((ref) => ref.current && (ref.current.value = ""));
    }
  };

  const finish = () =>
    start(async () => {
      const r = await submitForApproval(task.id, notes);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show("Enviada para aprovação.");
      router.refresh();
    });

  const startButton = canStart && (
    <button type="button" className="btn-xl btn-primary" disabled={pending} onClick={begin}>
      {task.returned ? <Undo2 /> : <Play />}
      {pending ? "Iniciando…" : task.returned ? "Iniciar correção" : "Iniciar tarefa"}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className={cn("card card-pad", task.late && "ring-1 ring-inset ring-red-200")}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-700">
            <TypeIcon type={task.type} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-[22px] font-semibold leading-7 tracking-tight text-stone-900">{t.label}</h1>
              <PriorityBadge priority={task.priority} />
            </div>
            <p className="text-base font-medium text-stone-700">{task.location.name}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-stone-500">{task.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={task.status} late={task.late} />
          <span className={cn("tabular-nums", task.late ? "font-semibold text-red-700" : "text-stone-600")}>Prazo {formatDateTime(task.dueAt)}</span>
        </div>
        {running && task.sessionStartedAt && (
          <p className="mt-3 flex items-center gap-2 rounded-[10px] bg-orange-50 px-3 py-2.5 text-sm text-orange-900">
            <Timer className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Iniciada às {formatTime(task.startedAt)} · <span className="font-semibold tabular-nums"><Elapsed since={task.sessionStartedAt} previous={task.previousMinutes} /></span> de trabalho
            </span>
          </p>
        )}
      </div>

      {task.returned && task.status !== "AGUARDANDO_APROVACAO" && (
        <div className="flex gap-3 rounded-[14px] bg-amber-50 p-4 text-amber-900">
          <Undo2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">A liderança pediu correção</p>
            <p className="mt-0.5 text-base">{task.returned}</p>
          </div>
        </div>
      )}

      {startButton}

      <div className="grid grid-cols-2 gap-2.5">
        <Link href={`/ocorrencia/nova?local=${task.location.id}&tarefa=${task.id}`} className="btn-secondary min-h-13 text-base text-amber-800">
          <TriangleAlert /> Registrar problema
        </Link>
        <Link href={`/local/${task.location.id}`} className="btn-secondary min-h-13 text-base">
          <MapPin /> Ver local
        </Link>
      </div>

      <Step n={1} title="Foto do local">
        <PhotoGallery photos={task.referencePhotos} emptyText="Sem fotos de referência." columns="grid-cols-2 sm:grid-cols-3" />
      </Step>

      <Step n={2} title="Instruções">
        {task.description && (
          <p className="mb-3 rounded-[10px] bg-amber-50 p-3 text-base text-amber-900">
            <span className="font-semibold">Problema:</span> {task.description}
          </p>
        )}
        <p className="whitespace-pre-line text-base leading-relaxed text-stone-800">{task.instructions || "Sem instruções adicionais. Siga o checklist."}</p>
      </Step>

      <Step n={3} title="Checklist" aside={checklist.length > 0 && <span className="text-sm tabular-nums text-stone-500">{doneCount} de {checklist.length}</span>}>
        {checklist.length === 0 ? (
          <p className="text-sm text-stone-500">Esta tarefa não possui checklist.</p>
        ) : (
          <ul className="-mx-1 divide-y divide-stone-100">
            {checklist.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={c.done}
                  onClick={() => toggle(c.id, !c.done)}
                  className={cn("flex min-h-14 w-full items-center gap-3 rounded-[10px] px-1 py-2 text-left transition-colors hover:bg-stone-50", !running && "opacity-60")}
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", c.done ? "bg-green-600 text-white" : "bg-white shadow-[inset_0_0_0_1.5px_rgba(60,60,67,0.3)]")}>
                    {c.done && <Check className="h-[18px] w-[18px]" strokeWidth={2.5} />}
                  </span>
                  <span className={cn("flex-1 text-base", c.done ? "text-stone-500 line-through decoration-stone-300" : "text-stone-900")}>{c.text}</span>
                  {c.required && !c.done && <span className="text-xs font-medium text-red-600">Obrigatório</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step n={4} title="Observações" aside={<span className="text-xs text-stone-500">{notesSaved ? "Salvo" : "Salva ao sair do campo"}</span>}>
        <textarea
          className="input min-h-28 text-base"
          placeholder="Anote o que achar importante sobre o serviço"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesSaved(false);
          }}
          onBlur={saveNotes}
          disabled={!running && !canStart}
        />
      </Step>

      <Step n={5} title="Fotos">
        <input ref={afterRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload("DEPOIS", e.target.files)} />
        <input ref={duringRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload("DURANTE", e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(galleryStage, e.target.files)} />
        <div className="space-y-2.5">
          <button type="button" className="btn-xl btn-primary" disabled={!running || !!uploading} onClick={() => afterRef.current?.click()}>
            <Camera /> {uploading === "DEPOIS" ? "Enviando…" : "Foto do serviço pronto"}
          </button>
          <button type="button" className="btn-secondary min-h-12 w-full text-base" disabled={!running || !!uploading} onClick={() => duringRef.current?.click()}>
            <Camera /> {uploading === "DURANTE" ? "Enviando…" : "Foto durante o serviço (opcional)"}
          </button>
          {running && (
            <div className="flex justify-center gap-1">
              <button type="button" className="btn-ghost text-sm" onClick={() => { setGalleryStage("DEPOIS"); galleryRef.current?.click(); }}>
                <Images /> Galeria: foto final
              </button>
              <button type="button" className="btn-ghost text-sm" onClick={() => { setGalleryStage("DURANTE"); galleryRef.current?.click(); }}>
                <Images /> Galeria: durante
              </button>
            </div>
          )}
          {!running && canStart && <p className="text-center text-sm text-stone-500">Inicie a tarefa para tirar fotos.</p>}
        </div>
        {task.afterPhotos.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold text-stone-700">Depois · {task.afterPhotos.length}</p>
            <PhotoGallery photos={task.afterPhotos} deletableIds={running ? task.myPhotoIds : []} columns="grid-cols-3" />
          </div>
        )}
        {task.duringPhotos.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold text-stone-700">Durante · {task.duringPhotos.length}</p>
            <PhotoGallery photos={task.duringPhotos} deletableIds={running ? task.myPhotoIds : []} columns="grid-cols-3" />
          </div>
        )}
      </Step>

      {running && (
        <section className="space-y-2.5 pb-4">
          {!canSubmit && (
            <div className="rounded-[14px] bg-stone-100 p-4 text-sm text-stone-700">
              <p className="font-semibold text-stone-900">Para finalizar, falta:</p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                {pendingRequired.map((c) => (
                  <li key={c.id}>{c.text}</li>
                ))}
                {missingAfter && <li>Foto do serviço pronto</li>}
              </ul>
            </div>
          )}
          <button type="button" className="btn-xl btn-primary" disabled={pending || !canSubmit} onClick={finish}>
            <Send /> {pending ? "Enviando…" : "Finalizar e enviar para aprovação"}
          </button>
        </section>
      )}
      {canStart && <div className="pb-4">{startButton}</div>}
    </div>
  );
}
