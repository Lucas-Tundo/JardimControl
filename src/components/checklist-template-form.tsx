"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteChecklistTemplate, saveChecklistTemplate } from "@/app/actions/admin";
import { MAINTENANCE_TYPES } from "@/lib/constants";
import { ChecklistEditor, type EditableItem } from "./checklist-editor";
import { Dialog } from "./dialog";
import { useToast } from "./toast";

type Template = { id: string; name: string; type: string | null; items: { text: string; required: boolean }[] };

export function ChecklistTemplateButton({ initial, label, className }: { initial?: Template; label: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [items, setItems] = useState<EditableItem[]>(initial?.items ?? []);

  const save = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("type", type);
      fd.set("items", JSON.stringify(items));
      const r = await saveChecklistTemplate(initial?.id ?? null, fd);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show(r.message ?? "Salvo.");
      setOpen(false);
      if (!initial) {
        setName("");
        setType("");
        setItems([]);
      }
      router.refresh();
    });

  const remove = () => {
    if (!initial || !confirm(`Excluir o checklist "${initial.name}"? Tarefas já criadas não são afetadas.`)) return;
    start(async () => {
      const r = await deleteChecklistTemplate(initial.id);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show("Checklist excluído.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className={className ?? "btn-primary"} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={initial ? "Editar checklist padrão" : "Novo checklist padrão"} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Poda padrão" />
            </div>
            <div>
              <label className="label">Tipo de manutenção (opcional)</label>
              <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Qualquer tipo</option>
                {Object.entries(MAINTENANCE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ChecklistEditor items={items} onChange={setItems} templates={[]} />
          <div className="flex flex-wrap justify-between gap-2">
            {initial ? (
              <button type="button" className="btn-ghost text-red-600" disabled={pending} onClick={remove}>
                Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" disabled={pending} onClick={save}>
                {pending ? "Salvando…" : "Salvar checklist"}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
