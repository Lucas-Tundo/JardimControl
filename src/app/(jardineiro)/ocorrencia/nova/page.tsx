import { OccurrenceForm } from "@/components/occurrence-form";
import { BackLink } from "@/components/ui";
import { myTasksWhere, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFormOptions, param, type SearchParams } from "@/lib/queries";

export const metadata = { title: "Registrar problema" };

export default async function GardenerOccurrencePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const taskId = param(sp, "tarefa");
  const [options, task] = await Promise.all([
    getFormOptions(),
    taskId ? db.task.findFirst({ where: { AND: [myTasksWhere(user), { id: taskId }] }, select: { id: true, locationId: true } }) : null,
  ]);

  return (
    <div className="space-y-4">
      <div>
        <BackLink href={task ? `/minhas-tarefas/${task.id}` : "/minhas-tarefas"} />
        <h1 className="page-title">Registrar problema</h1>
        <p className="mt-0.5 text-sm text-stone-500">Viu algo errado? Tire uma foto e avise a liderança.</p>
      </div>
      <OccurrenceForm
        options={options}
        presetLocationId={task?.locationId ?? (param(sp, "local") || undefined)}
        taskId={task?.id}
        redirectTo={task ? `/minhas-tarefas/${task.id}` : "/minhas-tarefas"}
      />
    </div>
  );
}
