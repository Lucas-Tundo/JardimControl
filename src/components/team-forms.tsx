"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveTeam, saveUser, toggleUserActive } from "@/app/actions/admin";
import { ROLES } from "@/lib/constants";
import { Dialog, ModalFooter, useConfirm } from "./dialog";
import { useToast } from "./toast";

type Option = { id: string; name: string };

export type UserFormValue = { id: string; name: string; login: string; role: string; email: string | null; phone: string | null; teamIds: string[] };

export function UserDialogButton({ initial, teams, label, className }: { initial?: UserFormValue; teams: Option[]; label: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const submit = (form: FormData) =>
    start(async () => {
      const r = await saveUser(initial?.id ?? null, form);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show(r.message ?? "Salvo.");
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" className={className ?? "btn-primary"} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnBackdrop={!pending}
        kicker="Equipe e usuários"
        title={initial ? "Editar usuário" : "Novo usuário"}
        description={initial ? "A senha só muda se você digitar uma nova." : "O login e a senha são usados para entrar no sistema."}
      >
        <form action={submit} className="space-y-3">
          <div>
            <label className="label">Nome completo</label>
            <input name="name" className="input" defaultValue={initial?.name} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Login</label>
              <input name="login" className="input lowercase" defaultValue={initial?.login} required autoCapitalize="none" />
            </div>
            <div>
              <label className="label">Perfil</label>
              <select name="role" className="input" defaultValue={initial?.role ?? "JARDINEIRO"}>
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Telefone</label>
              <input name="phone" className="input" defaultValue={initial?.phone ?? ""} inputMode="tel" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input name="email" type="email" className="input" defaultValue={initial?.email ?? ""} />
            </div>
          </div>
          <div>
            <label className="label">{initial ? "Nova senha (deixe em branco para manter)" : "Senha"}</label>
            <input name="password" type="password" className="input" minLength={6} required={!initial} autoComplete="new-password" />
          </div>
          {teams.length > 0 && (
            <fieldset>
              <legend className="label">Equipes</legend>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <label key={t.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-stone-200 px-3 text-sm">
                    <input type="checkbox" name="teamIds" value={t.id} defaultChecked={initial?.teamIds.includes(t.id)} className="accent-brand-700" />
                    {t.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </ModalFooter>
        </form>
      </Dialog>
    </>
  );
}

export function ToggleUserButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  return (
    <button
      type="button"
      className={`btn-ghost min-h-9 px-3 text-sm ${active ? "text-red-600" : "text-brand-700"}`}
      disabled={pending}
      onClick={async () => {
        if (active && !(await confirm({ title: "Desativar este usuário?", description: "Ele não conseguirá mais entrar no sistema. O histórico continua guardado.", confirmLabel: "Desativar" }))) return;
        start(async () => {
          const r = await toggleUserActive(id);
          if (!r.ok) return toast.show(r.error, "error");
          router.refresh();
        });
      }}
    >
      {active ? "Desativar" : "Reativar"}
    </button>
  );
}

export type TeamFormValue = { id: string; name: string; description: string | null; color: string; memberIds: string[] };

export function TeamDialogButton({ initial, users, label, className }: { initial?: TeamFormValue; users: Option[]; label: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const submit = (form: FormData) =>
    start(async () => {
      const r = await saveTeam(initial?.id ?? null, form);
      if (!r.ok) return toast.show(r.error, "error");
      toast.show(r.message ?? "Salvo.");
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" className={className ?? "btn-primary"} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnBackdrop={!pending}
        kicker="Equipe e usuários"
        title={initial ? "Editar equipe" : "Nova equipe"}
        description="Equipes agrupam jardineiros para receber tarefas em conjunto."
      >
        <form action={submit} className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="label">Nome da equipe</label>
              <input name="name" className="input" defaultValue={initial?.name} required />
            </div>
            <div>
              <label className="label">Cor</label>
              <input name="color" type="color" className="h-11 w-16 cursor-pointer rounded-[10px] border border-stone-300" defaultValue={initial?.color ?? "#16a34a"} />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <input name="description" className="input" defaultValue={initial?.description ?? ""} />
          </div>
          <fieldset>
            <legend className="label">Membros</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {users.map((u) => (
                <label key={u.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-stone-200 px-3 text-sm">
                  <input type="checkbox" name="memberIds" value={u.id} defaultChecked={initial?.memberIds.includes(u.id)} className="accent-brand-700" />
                  {u.name}
                </label>
              ))}
            </div>
          </fieldset>
          <ModalFooter>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </ModalFooter>
        </form>
      </Dialog>
    </>
  );
}
