import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { ExecutionView } from "@/components/execution-view";
import { TaskRecord } from "@/components/task-record";
import { BackLink, StatusBadge } from "@/components/ui";
import { canAccessTask, requireUser } from "@/lib/auth";
import { formatDateTime, formatDuration } from "@/lib/dates";
import { toPhotoView } from "@/lib/queries";
import { getTaskDetail } from "@/lib/task-detail";
import { isLate, taskCode } from "@/lib/tasks";

export const metadata = { title: "Tarefa" };

const EXECUTABLE = ["PROGRAMADA", "PENDENTE", "ATRASADA", "EM_ANDAMENTO"];

export default async function GardenerTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const task = await getTaskDetail(id);
  if (!task || !canAccessTask(user, task)) notFound();

  const back = <BackLink href="/minhas-tarefas">Minhas tarefas</BackLink>;

  if (!EXECUTABLE.includes(task.status)) {
    return (
      <div className="space-y-3">
        {back}
        <div className="card card-pad">
          <p className="text-xs text-stone-500">{taskCode(task.number)}</p>
          <h1 className="text-[22px] font-semibold leading-7 tracking-tight text-stone-900">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={task.status} />
            {task.totalMinutes > 0 && <span className="chip bg-stone-100 tabular-nums text-stone-700">{formatDuration(task.totalMinutes)} de trabalho</span>}
          </div>
          {task.status === "AGUARDANDO_APROVACAO" && (
            <p className="mt-3 rounded-[10px] bg-violet-50 p-3 text-sm text-violet-900">
              Enviada em {formatDateTime(task.submittedAt)}. A liderança vai analisar e você recebe um aviso.
            </p>
          )}
          {task.status === "CONCLUIDA" && (
            <p className="mt-3 rounded-[10px] bg-green-50 p-3 text-sm text-green-900">
              Aprovada por {task.approvedBy?.name ?? "liderança"} em {formatDateTime(task.approvedAt)}.
            </p>
          )}
        </div>
        <TaskRecord task={task} hideTimeline locationHref={`/local/${task.locationId}`} />
      </div>
    );
  }

  const photos = task.photos.map(toPhotoView);
  const openLog = task.timeLogs.find((l) => !l.endedAt);
  const previousMinutes = task.timeLogs.filter((l) => l.endedAt).reduce((s, l) => s + l.minutes, 0);

  return (
    <div className="space-y-3">
      <AutoRefresh seconds={60} />
      {back}
      <ExecutionView
        task={{
          id: task.id,
          title: task.title,
          type: task.type,
          priority: task.priority,
          status: task.status,
          late: isLate(task),
          location: { id: task.location.id, name: task.location.name, area: task.area.name },
          description: task.description,
          instructions: task.instructions,
          scheduledAt: task.scheduledAt,
          dueAt: task.dueAt,
          startedAt: task.startedAt,
          sessionStartedAt: openLog?.startedAt ?? null,
          previousMinutes,
          returned: task.returnCount > 0 ? task.lastReturnReason : null,
          notes: task.executionNotes ?? "",
          checklist: task.checklist.map((c) => ({ id: c.id, text: c.text, required: c.required, done: c.done })),
          referencePhotos: [...photos.filter((p) => p.stage === "ANTES" || p.stage === "REFERENCIA"), ...task.location.photos.map(toPhotoView)],
          duringPhotos: photos.filter((p) => p.stage === "DURANTE"),
          afterPhotos: photos.filter((p) => p.stage === "DEPOIS"),
          myPhotoIds: task.photos.filter((p) => p.uploadedById === user.id && (p.stage === "DURANTE" || p.stage === "DEPOIS")).map((p) => p.id),
        }}
      />
    </div>
  );
}
