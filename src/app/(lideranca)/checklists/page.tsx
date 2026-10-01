import { Square } from "lucide-react";
import { ChecklistTemplateButton } from "@/components/checklist-template-form";
import { EmptyState, PageHeader, TypeLabel } from "@/components/ui";
import { DEFAULT_CHECKLIST } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata = { title: "Checklists padrão" };

export default async function ChecklistsPage() {
  const templates = await db.checklistTemplate.findMany({
    include: { items: { orderBy: { order: "asc" } }, createdBy: { select: { name: true } }, _count: { select: { recurrences: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Checklists padrão"
        subtitle="Modelos reutilizáveis ao criar tarefas, rondas e manutenções recorrentes"
        actions={<ChecklistTemplateButton label="Novo checklist" />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="card card-pad bg-stone-50">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">Checklist geral</h2>
            <span className="chip bg-stone-100 text-stone-600">Sistema</span>
          </div>
          <p className="mb-2 text-xs text-stone-500">Usado quando nenhum modelo é escolhido na Ronda.</p>
          <ul className="space-y-1.5 text-sm text-stone-800">
            {DEFAULT_CHECKLIST.map((i) => (
              <li key={i.text} className="flex items-start gap-2">
                <Square className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                {i.text}
                {i.required && <span className="text-xs text-red-600">Obrigatório</span>}
              </li>
            ))}
          </ul>
        </div>
        {templates.map((t) => (
          <div key={t.id} className="card card-pad">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h2 className="section-title">{t.name}</h2>
              <ChecklistTemplateButton
                label="Editar"
                className="btn-ghost min-h-9 px-3 text-sm"
                initial={{ id: t.id, name: t.name, type: t.type, items: t.items.map((i) => ({ text: i.text, required: i.required })) }}
              />
            </div>
            <p className="mb-2.5 flex flex-wrap items-center gap-1 text-xs text-stone-500">
              {t.type ? <TypeLabel type={t.type} /> : "Qualquer tipo"} · {t.items.length} itens
              {t._count.recurrences > 0 && ` · usado em ${t._count.recurrences === 1 ? "1 recorrência" : `${t._count.recurrences} recorrências`}`}
            </p>
            <ul className="space-y-1.5 text-sm text-stone-800">
              {t.items.map((i) => (
                <li key={i.id} className="flex items-start gap-2">
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                  {i.text}
                  {i.required && <span className="text-xs text-red-600">Obrigatório</span>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Criado por {t.createdBy?.name ?? "-"} em {formatDate(t.createdAt)}
            </p>
          </div>
        ))}
      </div>
      {templates.length === 0 && (
        <div className="mt-4">
          <EmptyState title="Nenhum checklist padrão cadastrado" />
        </div>
      )}
      <p className="mt-4 text-xs text-stone-500">
        Itens obrigatórios bloqueiam a finalização da tarefa até serem marcados.
      </p>
    </div>
  );
}
