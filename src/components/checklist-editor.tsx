"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { DEFAULT_CHECKLIST } from "@/lib/constants";

export type EditableItem = { id?: string; text: string; required: boolean; done?: boolean };

export function ChecklistEditor({
  items,
  onChange,
  templates,
}: {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
  templates: { id: string; name: string; items: { text: string; required: boolean }[] }[];
}) {
  const [text, setText] = useState("");
  const [required, setRequired] = useState(true);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    onChange([...items, { text: t, required }]);
    setText("");
  };
  const update = (i: number, patch: Partial<EditableItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const loadTemplate = (id: string) => {
    const tpl = id === "__default" ? { items: DEFAULT_CHECKLIST } : templates.find((t) => t.id === id);
    if (!tpl) return;
    const existing = new Set(items.map((i) => i.text.toLowerCase()));
    onChange([...items, ...tpl.items.filter((i) => !existing.has(i.text.toLowerCase())).map((i) => ({ ...i }))]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <select aria-label="Adicionar itens de um checklist padrão" className="input w-auto flex-1" value="" onChange={(e) => loadTemplate(e.target.value)}>
          <option value="">Adicionar itens de um checklist padrão</option>
          <option value="__default">Checklist geral</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.items.length} itens)
            </option>
          ))}
        </select>
        {items.length > 0 && (
          <button type="button" className="btn-ghost text-red-600" onClick={() => onChange(items.filter((i) => i.done))}>
            Limpar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-[10px] bg-stone-100/70 p-3 text-center text-sm text-stone-500">Nenhum item no checklist.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-[10px] border border-stone-200">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 p-2">
              <span className="w-5 text-center text-xs tabular-nums text-stone-400">{i + 1}</span>
              <input aria-label={`Item ${i + 1}`} className="input flex-1" value={it.text} onChange={(e) => update(i, { text: e.target.value })} disabled={it.done} />
              <label className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 min-h-9 text-xs font-medium ${it.required ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-500"}`}>
                <input type="checkbox" className="accent-red-600" checked={it.required} onChange={(e) => update(i, { required: e.target.checked })} />
                Obrigatório
              </label>
              <button type="button" className="btn-icon text-stone-500" onClick={() => move(i, -1)} aria-label="Subir">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="btn-icon text-stone-500" onClick={() => move(i, 1)} aria-label="Descer">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" className="btn-icon text-stone-500 hover:text-red-600 disabled:opacity-30" disabled={it.done} onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remover">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <input aria-label="Novo item" className="input flex-1" placeholder="Novo item (ex.: Utilizar os EPIs necessários)" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <label className="flex min-h-11 items-center gap-1.5 text-sm text-stone-700">
          <input type="checkbox" className="accent-red-600" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Obrigatório
        </label>
        <button type="button" className="btn-secondary" onClick={add}>
          Adicionar
        </button>
      </div>
      <p className="text-xs text-stone-500">Itens obrigatórios bloqueiam a finalização da tarefa até serem marcados pelo jardineiro.</p>
    </div>
  );
}
