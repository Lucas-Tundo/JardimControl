"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSchedule } from "@/app/actions/recurrences";
import { dateKey } from "@/lib/dates";
import { Dialog, ModalFooter } from "./dialog";
import { useToast } from "./toast";

export function NewScheduleButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Novo cronograma
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnBackdrop={!pending}
        kicker="Cronograma"
        title="Novo cronograma"
        description="Agrupe tarefas e recorrentes em um plano (ex.: “Cronograma de verão 2026”). Depois vincule as tarefas a ele no cadastro."
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveSchedule(fd);
              if (!r.ok) return toast.show(r.error, "error");
              toast.show(r.message ?? "Criado.");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div>
            <label className="label">Nome *</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea name="description" className="input min-h-16" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Início *</label>
              <input name="startDate" type="date" className="input" defaultValue={dateKey(new Date())} required />
            </div>
            <div>
              <label className="label">Fim</label>
              <input name="endDate" type="date" className="input" />
            </div>
          </div>
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? "Criando…" : "Criar cronograma"}
            </button>
          </ModalFooter>
        </form>
      </Dialog>
    </>
  );
}
