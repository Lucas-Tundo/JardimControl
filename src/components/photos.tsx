"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Dialog } from "./dialog";
import { useToast } from "./toast";
import { compressAll } from "@/lib/image-client";
import { formatDate, formatTime } from "@/lib/dates";
import { PHOTO_STAGES, type PhotoStage } from "@/lib/constants";
import { deletePhoto } from "@/app/actions/execution";

export type PhotoView = {
  id: string;
  url: string;
  stage: string;
  takenAt: Date;
  uploadedBy: string;
  location: string;
  task?: string | null;
  caption?: string | null;
};

const STAGE_DOT: Record<string, string> = {
  REFERENCIA: "bg-blue-400",
  ANTES: "bg-amber-400",
  DURANTE: "bg-orange-400",
  DEPOIS: "bg-green-400",
  OCORRENCIA: "bg-red-400",
};

function StageTag({ stage, solid }: { stage: string; solid?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ${solid ? "bg-stone-100 text-stone-700" : "bg-black/55 text-white backdrop-blur-sm"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[stage] ?? "bg-stone-400"}`} aria-hidden />
      {PHOTO_STAGES[stage as PhotoStage] ?? stage}
    </span>
  );
}

export function PhotoMeta({ photo }: { photo: PhotoView }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-stone-800 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-stone-500">Data e horário</dt>
        <dd className="tabular-nums">
          {formatDate(photo.takenAt)} às {formatTime(photo.takenAt)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-stone-500">Usuário</dt>
        <dd>{photo.uploadedBy}</dd>
      </div>
      <div>
        <dt className="text-xs text-stone-500">Local</dt>
        <dd>{photo.location}</dd>
      </div>
      {photo.task && (
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-stone-500">Manutenção</dt>
          <dd>{photo.task}</dd>
        </div>
      )}
    </dl>
  );
}

export function PhotoGallery({
  photos,
  deletableIds = [],
  emptyText = "Nenhuma foto registrada.",
  columns = "grid-cols-3 sm:grid-cols-4",
}: {
  photos: PhotoView[];
  deletableIds?: string[];
  emptyText?: string;
  columns?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  if (!photos.length) return <p className="text-sm text-stone-500">{emptyText}</p>;
  const current = open !== null ? photos[open] : null;

  const remove = (id: string) => {
    if (!confirm("Remover esta foto?")) return;
    start(async () => {
      const r = await deletePhoto(id);
      if (!r.ok) return toast.show(r.error, "error");
      setOpen(null);
      toast.show("Foto removida.");
      router.refresh();
    });
  };

  return (
    <>
      <div className={`grid gap-2 ${columns}`}>
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setOpen(i)} className="group relative aspect-square overflow-hidden rounded-[10px] bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption ?? p.stage} loading="lazy" className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90" />
            <span className="absolute left-1.5 top-1.5">
              <StageTag stage={p.stage} />
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-xs font-medium tabular-nums text-white">
              {formatDate(p.takenAt)} {formatTime(p.takenAt)}
            </span>
          </button>
        ))}
      </div>
      <Dialog open={!!current} onClose={() => setOpen(null)} title={current ? <StageTag stage={current.stage} solid /> : ""} wide>
        {current && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt="" className="max-h-[60vh] w-full rounded-[10px] bg-stone-100 object-contain" />
            {current.caption && <p className="text-sm text-stone-700">{current.caption}</p>}
            <PhotoMeta photo={current} />
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex gap-2.5">
                <button type="button" className="btn-secondary" disabled={open === 0} onClick={() => setOpen((o) => (o ?? 1) - 1)}>
                  <ChevronLeft /> Anterior
                </button>
                <button type="button" className="btn-secondary" disabled={open === photos.length - 1} onClick={() => setOpen((o) => (o ?? 0) + 1)}>
                  Próxima <ChevronRight />
                </button>
              </div>
              {deletableIds.includes(current.id) && (
                <button type="button" className="btn-danger" disabled={pending} onClick={() => remove(current.id)}>
                  <Trash2 /> Remover
                </button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

/** Comparativo lado a lado: antes e depois. */
export function BeforeAfter({ before, after }: { before: PhotoView[]; after: PhotoView[] }) {
  const [bi, setBi] = useState(0);
  const [ai, setAi] = useState(Math.max(0, after.length - 1));
  if (!before.length && !after.length) return <p className="text-sm text-stone-500">Sem fotos para comparar.</p>;
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
      <CompareSide label="Antes" photo={before[bi]} list={before} idx={bi} setIdx={setBi} tone="bg-amber-400" />
      <CompareSide label="Depois" photo={after[ai]} list={after} idx={ai} setIdx={setAi} tone="bg-green-500" />
    </div>
  );
}

function CompareSide({ label, photo, list, idx, setIdx, tone }: { label: string; photo?: PhotoView; list: PhotoView[]; idx: number; setIdx: (n: number) => void; tone: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-stone-800">
        <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden />
        {label}
      </div>
      <div className="aspect-[4/3] overflow-hidden rounded-[10px] bg-stone-100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-stone-500">Sem foto de {label.toLowerCase()}</div>
        )}
      </div>
      {photo && (
        <p className="mt-1 truncate text-xs tabular-nums text-stone-500">
          {formatDate(photo.takenAt)} {formatTime(photo.takenAt)} · {photo.uploadedBy}
        </p>
      )}
      {list.length > 1 && (
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
          {list.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setIdx(i)} className={`h-10 w-10 shrink-0 overflow-hidden rounded-md ring-2 ${i === idx ? "ring-brand-600" : "ring-transparent"}`} aria-label={`Foto ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Botão que abre a câmera do celular (ou seletor de arquivos no computador).
 * As imagens são comprimidas antes de serem entregues.
 */
export function PhotoPicker({
  onFiles,
  label = "Tirar foto",
  className = "btn-secondary",
  multiple = true,
  disabled,
  allowGallery = true,
}: {
  onFiles: (files: File[]) => void;
  label?: string;
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
  allowGallery?: boolean;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const handle = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      onFiles(await compressAll(list));
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = "";
      if (galRef.current) galRef.current.value = "";
    }
  };
  return (
    <div className="flex w-full flex-col gap-1">
      <input ref={camRef} type="file" accept="image/*" capture="environment" multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
      <input ref={galRef} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
      <button type="button" className={className} disabled={disabled || busy} onClick={() => camRef.current?.click()}>
        <Camera /> {busy ? "Processando…" : label}
      </button>
      {allowGallery && (
        <button type="button" className="min-h-9 text-sm font-medium text-brand-700 underline-offset-2 hover:underline disabled:opacity-50" disabled={disabled || busy} onClick={() => galRef.current?.click()}>
          ou escolher da galeria
        </button>
      )}
    </div>
  );
}

/** Pré-visualização de fotos ainda não enviadas (formulários). */
export function PendingPhotos({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {files.map((f, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-[10px] bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
          <button type="button" onClick={() => onRemove(i)} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Remover foto">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
