"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteChecklistTemplate, saveChecklistTemplate } from "@/app/actions/admin";
import { MAINTENANCE_TYPES } from "@/lib/constants";
import { ChecklistEditor, type EditableItem } from "./checklist-editor";
import { Dialog, ModalFooter, useConfirm } from "./dialog";
import { useToast } from "./toast";

type Template = { id: string; name: string; type: string | null; items: { text: string; required: boolean }[] };

export function ChecklistTemplateButton({ initial, label, className }: { initial?: Template; label: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const confirm = useConfirm();
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

  const remove = async () => {
    if (!initial || !(await confirm({ title: `Excluir o checklist "${initial.name}"?`, description: "Tarefas já criadas não são afetadas.", confirmLabel: "Excluir" }))) return;
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
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnBackdrop={!pending}
        size="md"
        kicker="Checklists padrão"
        title={initial ? "Editar checklist padrão" : "Novo checklist padrão"}
        description="Os itens entram automaticamente nas novas tarefas do tipo escolhido."
      >
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
        </div>
        <ModalFooter>
          {initial && (
            <button type="button" className="btn-ghost mr-auto text-[var(--ds-red)]" disabled={pending} onClick={remove}>
              Excluir
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={pending} onClick={save}>
            {pending ? "Salvando…" : "Salvar checklist"}
          </button>
        </ModalFooter>
      </Dialog>
    </>
  );
}
