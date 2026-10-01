"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Filter, X } from "lucide-react";
import { MAINTENANCE_TYPES, PRIORITIES, TASK_STATUS } from "@/lib/constants";

type Opt = { id: string; name: string };

export type FilterField = "periodo" | "responsavel" | "equipe" | "area" | "local" | "tipo" | "status" | "prioridade" | "q";

export function FilterBar({
  fields,
  users = [],
  teams = [],
  areas = [],
  locations = [],
  defaultOpen = false,
}: {
  fields: FilterField[];
  users?: Opt[];
  teams?: Opt[];
  areas?: Opt[];
  locations?: Opt[];
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(defaultOpen);
  const active = ["de", "ate", "responsavel", "equipe", "area", "local", "tipo", "status", "prioridade", "q"].filter((k) => sp.get(k)).length;

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const clear = () => {
    const next = new URLSearchParams();
    for (const k of ["view", "data"]) if (sp.get(k)) next.set(k, sp.get(k)!);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-stone-500">{label}</span>
      <select className="input py-2" value={sp.get(key) ?? ""} onChange={(e) => set(key, e.target.value)}>
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="card mb-4 p-3">
      <div className="flex items-center gap-2">
        {fields.includes("q") && (
          <input
            className="input flex-1 py-2"
            placeholder="Buscar por título, local ou código (JC-0001)"
            defaultValue={sp.get("q") ?? ""}
            onKeyDown={(e) => e.key === "Enter" && set("q", (e.target as HTMLInputElement).value)}
            onBlur={(e) => e.target.value !== (sp.get("q") ?? "") && set("q", e.target.value)}
          />
        )}
        <button type="button" className="btn-secondary shrink-0" onClick={() => setOpen((o) => !o)}>
          <Filter /> Filtros {active > 0 && <span className="min-w-5 rounded-full bg-brand-700 px-1.5 text-center text-xs font-semibold tabular-nums text-white">{active}</span>}
        </button>
        {active > 0 && (
          <button type="button" className="btn-ghost shrink-0 px-3" onClick={clear}>
            <X /> Limpar
          </button>
        )}
        {pending && <span className="text-xs text-stone-400">Atualizando…</span>}
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {fields.includes("periodo") && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-500">De</span>
                <input type="date" className="input py-2" value={sp.get("de") ?? ""} onChange={(e) => set("de", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-500">Até</span>
                <input type="date" className="input py-2" value={sp.get("ate") ?? ""} onChange={(e) => set("ate", e.target.value)} />
              </label>
            </>
          )}
          {fields.includes("responsavel") && select("responsavel", "Jardineiro", users.map((u) => ({ value: u.id, label: u.name })))}
          {fields.includes("equipe") && select("equipe", "Equipe", teams.map((t) => ({ value: t.id, label: t.name })))}
          {fields.includes("area") && select("area", "Área", areas.map((a) => ({ value: a.id, label: a.name })))}
          {fields.includes("local") && select("local", "Local", locations.map((a) => ({ value: a.id, label: a.name })))}
          {fields.includes("tipo") && select("tipo", "Tipo de serviço", Object.entries(MAINTENANCE_TYPES).map(([k, v]) => ({ value: k, label: v.label })))}
          {fields.includes("status") &&
            select("status", "Status", [
              { value: "ABERTAS", label: "Todas em aberto" },
              ...Object.entries(TASK_STATUS).map(([k, v]) => ({ value: k, label: v.label })),
            ])}
          {fields.includes("prioridade") && select("prioridade", "Prioridade", Object.entries(PRIORITIES).map(([k, v]) => ({ value: k, label: v.label })))}
        </div>
      )}
    </div>
  );
}
