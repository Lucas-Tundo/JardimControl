import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dateKey, timeKey } from "@/lib/dates";
import { getFormOptions } from "@/lib/queries";
import { taskCode } from "@/lib/tasks";
import { TaskForm } from "@/components/task-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Editar tarefa" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task, options] = await Promise.all([
    db.task.findUnique({ where: { id }, include: { checklist: { orderBy: { order: "asc" } }, _count: { select: { photos: { where: { stage: "ANTES" } } } } } }),
    getFormOptions(),
  ]);
  if (!task || task.deletedAt) notFound();
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") redirect(`/tarefas/${id}`);

  return (
    <>
      <PageHeader title={`Editar ${taskCode(task.number)}`} subtitle={task.title} back={`/tarefas/${id}`} />
      <TaskForm
        options={options}
        taskId={task.id}
        existingPhotos={task._count.photos}
        initial={{
          title: task.title,
          description: task.description ?? undefined,
          instructions: task.instructions ?? undefined,
          locationId: task.locationId,
          assignee: task.assigneeUserId ? `user:${task.assigneeUserId}` : task.assigneeTeamId ? `team:${task.assigneeTeamId}` : "",
          date: dateKey(task.scheduledAt),
          time: timeKey(task.scheduledAt),
          dueDate: dateKey(task.dueAt),
          dueTime: timeKey(task.dueAt),
          type: task.type,
          priority: task.priority,
          periodicity: task.periodicity,
          scheduleId: task.scheduleId ?? undefined,
          checklist: task.checklist.map((c) => ({ id: c.id, text: c.text, required: c.required, done: c.done })),
        }}
        origin={task.origin}
      />
    </>
  );
}
