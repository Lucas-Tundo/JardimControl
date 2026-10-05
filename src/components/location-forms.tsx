"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addLocationPhotos, deleteArea, regenerateQrCode, saveArea, saveLocation, toggleLocationActive } from "@/app/actions/locations";
import { PERIODICITIES } from "@/lib/constants";
import type { FormOptions } from "@/lib/queries";
import { Dialog, ModalFooter, useConfirm } from "./dialog";
import { PendingPhotos, PhotoPicker } from "./photos";
import { AssigneeSelect } from "./task-form";
import { useToast } from "./toast";
import { plural } from "@/lib/text";

export type LocationInitial = {
  id?: string;
  name?: string;
  code?: string;
  areaId?: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  responsible?: string;
  maintenanceFrequency?: string | null;
  notes?: string | null;
  mapX?: number | null;
  mapY?: number | null;
};

export function LocationForm({ options, initial = {} }: { options: FormOptions; initial?: LocationInitial }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [photos, setPhotos] = useState<File[]>([]);
  const [responsible, setResponsible] = useState(initial.responsible ?? "");
  const [lat, setLat] = useState(initial.latitude?.toString() ?? "");
  const [lng, setLng] = useState(initial.longitude?.toString() ?? "");

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return toast.show("Geolocalização indisponível neste dispositivo.", "error");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
        toast.show("Coordenadas capturadas.");
      },
      () => toast.show("Não foi possível obter a localização.", "error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <form
      className="grid gap-4 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photos");
        photos.forEach((p) => fd.append("photos", p));
        start(async () => {
          const r = await saveLocation(initial.id ?? null, fd);
          if (!r.ok) return toast.show(r.error, "error");
          toast.show(r.message ?? "Salvo.");
          router.push(`/locais/${r.data!.id}`);
          router.refresh();
        });
      }}
    >
      <div className="card card-pad space-y-4 lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="label">Nome *</label>
            <input name="name" className="input" defaultValue={initial.name} placeholder="Ex.: Estacionamento · Bloco A" required />
          </div>
          <div>
            <label className="label">Código *</label>
            <input name="code" className="input" defaultValue={initial.code} placeholder="EXT-EA" required />
          </div>
          <div>
            <label className="label">Área *</label>
            <select name="areaId" className="input" defaultValue={initial.areaId ?? ""} required>
              <option value="">Selecione…</option>
              {options.areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Frequência de manutenção</label>
            <select name="maintenanceFrequency" className="input" defaultValue={initial.maintenanceFrequency ?? ""}>
              <option value="">Não definida</option>
              {Object.entries(PERIODICITIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Responsável</label>
            <AssigneeSelect options={options} value={responsible} onChange={setResponsible} name="responsible" required={false} />
          </div>
        </div>
        <div>
          <label className="label">Descrição</label>
          <textarea name="description" className="input min-h-20" defaultValue={initial.description ?? ""} />
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea name="notes" className="input min-h-16" defaultValue={initial.notes ?? ""} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="card card-pad space-y-3">
          <h2 className="section-title">Localização</h2>
          <div>
            <label className="label">Endereço / referência</label>
            <input name="address" className="input" defaultValue={initial.address ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Latitude</label>
              <input name="latitude" className="input" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input name="longitude" className="input" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          <button type="button" className="btn-secondary w-full" onClick={useMyLocation}>
            Usar minha localização atual
          </button>
          <p className="text-xs text-stone-500">As coordenadas permitem que a Ronda identifique o local automaticamente pelo GPS.</p>
          <input type="hidden" name="mapX" value={initial.mapX ?? ""} />
          <input type="hidden" name="mapY" value={initial.mapY ?? ""} />
        </div>
        <div className="card card-pad space-y-3">
          <h2 className="section-title">Fotos do local</h2>
          <PendingPhotos files={photos} onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))} />
          <PhotoPicker onFiles={(f) => setPhotos((p) => [...p, ...f])} label="Adicionar fotos" />
        </div>
        <button className="btn-primary w-full py-3" disabled={pending}>
          {pending ? "Salvando…" : initial.id ? "Salvar local" : "Cadastrar local e gerar QR Code"}
        </button>
      </div>
    </form>
  );
}

export type AreaInitial = { id?: string; name?: string; code?: string; description?: string | null; color?: string; mapX?: number; mapY?: number; mapW?: number; mapH?: number };

export function AreaDialogButton({ initial, label, className = "btn-secondary" }: { initial?: AreaInitial; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnBackdrop={!pending}
        kicker="Áreas e locais"
        title={initial?.id ? "Editar área" : "Nova área"}
        description="A área agrupa locais e aparece como setor na planta da empresa."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveArea(initial?.id ?? null, fd);
              if (!r.ok) return toast.show(r.error, "error");
              toast.show(r.message ?? "Salvo.");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Nome *</label>
              <input name="name" className="input" defaultValue={initial?.name} placeholder="Ex.: Área externa" required />
            </div>
            <div>
              <label className="label">Código *</label>
              <input name="code" className="input" defaultValue={initial?.code} required />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea name="description" className="input min-h-16" defaultValue={initial?.description ?? ""} />
          </div>
          <fieldset className="rounded-[10px] border border-stone-200 p-3">
            <legend className="px-1 text-sm font-semibold text-stone-700">Setor na planta da empresa (%)</legend>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="label text-xs">Cor</label>
                <input name="color" type="color" className="h-10 w-full rounded-lg border border-stone-300" defaultValue={initial?.color ?? "#bbf7d0"} />
              </div>
              {[
                ["mapX", "X", initial?.mapX ?? 5],
                ["mapY", "Y", initial?.mapY ?? 5],
                ["mapW", "Largura", initial?.mapW ?? 20],
                ["mapH", "Altura", initial?.mapH ?? 15],
              ].map(([n, l, v]) => (
                <div key={n as string}>
                  <label className="label text-xs">{l}</label>
                  <input name={n as string} type="number" step="0.5" min={0} max={100} className="input px-2" defaultValue={v as number} />
                </div>
              ))}
            </div>
          </fieldset>
          <ModalFooter>
            {initial?.id && (
              <button
                type="button"
                className="btn-ghost mr-auto text-[var(--ds-red)]"
                disabled={pending}
                onClick={async () => {
                  if (!(await confirm({ title: "Excluir esta área?", description: "Os locais da área precisam ser movidos ou excluídos antes.", confirmLabel: "Excluir" }))) return;
                  start(async () => {
                    const r = await deleteArea(initial.id!);
                    if (!r.ok) return toast.show(r.error, "error");
                    toast.show("Área excluída.");
                    setOpen(false);
                    router.refresh();
                  });
                }}
              >
                Excluir
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar área"}
            </button>
          </ModalFooter>
        </form>
      </Dialog>
    </>
  );
}

export function LocationPhotoUpload({ locationId }: { locationId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="space-y-2">
      <PendingPhotos files={files} onRemove={(i) => setFiles((f) => f.filter((_, idx) => idx !== i))} />
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-48">
          <PhotoPicker onFiles={(f) => setFiles((p) => [...p, ...f])} label="Adicionar fotos" />
        </div>
        {files.length > 0 && (
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const fd = new FormData();
                files.forEach((f) => fd.append("photos", f));
                const r = await addLocationPhotos(locationId, fd);
                if (!r.ok) return toast.show(r.error, "error");
                toast.show(r.message ?? "Enviado.");
                setFiles([]);
                router.refresh();
              })
            }
          >
            Enviar {plural(files.length, "foto", "fotos")}
          </button>
        )}
      </div>
    </div>
  );
}

export function QrAdminButtons({ locationId, active }: { locationId: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="btn-ghost text-sm"
        disabled={pending}
        onClick={async () => {
          if (!(await confirm({ title: "Gerar um novo QR Code?", description: "O código impresso atual deixará de funcionar.", confirmLabel: "Gerar novo" }))) return;
          start(async () => {
            const r = await regenerateQrCode(locationId);
            if (!r.ok) return toast.show(r.error, "error");
            toast.show(r.message ?? "Gerado.");
            router.refresh();
          });
        }}
      >
        Regenerar QR
      </button>
      <button
        className="btn-ghost text-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await toggleLocationActive(locationId);
            if (!r.ok) return toast.show(r.error, "error");
            toast.show(active ? "Local desativado." : "Local reativado.");
            router.refresh();
          })
        }
      >
        {active ? "Desativar local" : "Reativar local"}
      </button>
    </div>
  );
}
