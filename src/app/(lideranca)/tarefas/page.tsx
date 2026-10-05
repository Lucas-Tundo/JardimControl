import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { taskListInclude } from "@/lib/tasks";
import { buildTaskWhere, getFormOptions, param, type SearchParams } from "@/lib/queries";
import { AutoRefresh } from "@/components/auto-refresh";
import { FilterBar } from "@/components/filters";
import { TaskTable } from "@/components/task-views";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Tarefas" };

const PAGE = 50;

export default async function TasksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(param(sp, "p")) || 1);
  const where = buildTaskWhere(sp);
  const [options, total, tasks] = await Promise.all([
    getFormOptions(),
    db.task.count({ where }),
    db.task.findMany({ where, include: taskListInclude, orderBy: [{ scheduledAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p: number) => {
    const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v]] : [])));
    q.set("p", String(p));
    return `/tarefas?${q.toString()}`;
  };

  return (
    <>
      <AutoRefresh seconds={30} />
      <PageHeader
        title="Tarefas"
        subtitle={total === 1 ? "1 tarefa encontrada" : `${total} tarefas encontradas`}
        actions={
          <Link href="/tarefas/nova" className="btn-primary">
            <Plus /> Nova tarefa
          </Link>
        }
      />
      <FilterBar fields={["q", "periodo", "responsavel", "equipe", "area", "local", "tipo", "status", "prioridade"]} users={options.users} teams={options.teams} areas={options.areas} locations={options.locations} />
      <div className="card card-pad">
        <TaskTable tasks={tasks} stickyHead />
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2.5 text-sm">
            {page > 1 && <Link className="btn-secondary" href={link(page - 1)}><ChevronLeft /> Anterior</Link>}
            <span className="text-stone-500">Página {page} de {pages}</span>
            {page < pages && <Link className="btn-secondary" href={link(page + 1)}>Próxima <ChevronRight /></Link>}
          </div>
        )}
      </div>
    </>
  );
}
