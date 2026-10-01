import { notFound } from "next/navigation";
import { Undo2 } from "lucide-react";
import { isAdmin, requireLeader } from "@/lib/auth";
import { getTaskDetail } from "@/lib/task-detail";
import { isLate, taskCode } from "@/lib/tasks";
import { AutoRefresh } from "@/components/auto-refresh";
import { TaskRecord } from "@/components/task-record";
import { ApprovalPanel, TaskLeaderActions } from "@/components/task-leader-actions";
import { PageHeader, PriorityBadge, StatusBadge, TypeLabel } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTaskDetail(id);
  return { title: t ? `${taskCode(t.number)} · ${t.title}` : "Tarefa" };
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireLeader();
  const { id } = await params;
  const task = await getTaskDetail(id);
  if (!task) notFound();

  const pendingRequired = task.checklist.filter((c) => c.required && !c.done).length;
  const afterPhotos = task.photos.filter((p) => p.stage === "DEPOIS").length;

  return (
    <>
      {!["CONCLUIDA", "CANCELADA"].includes(task.status) && <AutoRefresh seconds={20} />}
      <PageHeader
        back="/tarefas"
        title={task.title}
        subtitle={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm tabular-nums text-stone-500">{taskCode(task.number)}</span>
            <StatusBadge status={task.status} late={isLate(task)} />
            <PriorityBadge priority={task.priority} />
            <span className="text-stone-600">
              <TypeLabel type={task.type} />
            </span>
          </span>
        }
        actions={<TaskLeaderActions taskId={task.id} status={task.status} isAdmin={isAdmin(user)} />}
      />

      {task.status === "AGUARDANDO_APROVACAO" && (
        <div className="mb-4">
          <ApprovalPanel taskId={task.id} pendingRequired={pendingRequired} afterPhotos={afterPhotos} />
        </div>
      )}
      {task.lastReturnReason && !["CONCLUIDA", "AGUARDANDO_APROVACAO", "CANCELADA"].includes(task.status) && (
        <div className="mb-4 flex gap-2.5 rounded-[14px] bg-amber-50 p-4 text-sm text-amber-900">
          <Undo2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-semibold">Devolvida para correção {task.returnCount === 1 ? "1 vez" : `${task.returnCount} vezes`}:</span> {task.lastReturnReason}
          </p>
        </div>
      )}

      <TaskRecord task={task} locationHref={`/locais/${task.locationId}`} />
    </>
  );
}
