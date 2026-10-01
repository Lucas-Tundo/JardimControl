import { db } from "@/lib/db";
import { addDays, dateKey } from "@/lib/dates";
import { getFormOptions, param, photoInclude, toPhotoView, type SearchParams } from "@/lib/queries";
import { OCCURRENCE_TYPES, labelOf } from "@/lib/constants";
import { occurrenceCode } from "@/lib/tasks";
import { TaskForm, type TaskFormInitial } from "@/components/task-form";
import { PhotoGallery } from "@/components/photos";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nova tarefa" };

const OCC_TO_TYPE: Record<string, string> = {
  ARVORE_DANIFICADA: "PODA",
  VAZAMENTO_IRRIGACAO: "IRRIGACAO",
  PRAGA: "CONTROLE_PRAGAS",
  EQUIPAMENTO_DANIFICADO: "OUTROS",
  AREA_INACESSIVEL: "OUTROS",
  MANUTENCAO_ADICIONAL: "OUTROS",
  OUTRO: "OUTROS",
};

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const options = await getFormOptions();
  const occurrenceId = param(sp, "ocorrencia");
  const date = param(sp, "data") || dateKey(new Date());
  const initial: TaskFormInitial = {
    date,
    dueDate: date,
    locationId: param(sp, "local") || undefined,
    checklist: [],
  };

  const occurrence = occurrenceId
    ? await db.occurrence.findUnique({ where: { id: occurrenceId }, include: { location: true, photos: { include: photoInclude } } })
    : null;
  if (occurrence) {
    initial.title = `${labelOf(OCCURRENCE_TYPES, occurrence.type)} · ${occurrence.location.name}`;
    initial.description = occurrence.description;
    initial.locationId = occurrence.locationId;
    initial.priority = occurrence.priority;
    initial.type = OCC_TO_TYPE[occurrence.type] ?? "OUTROS";
    initial.dueDate = dateKey(addDays(new Date(), occurrence.priority === "URGENTE" ? 0 : occurrence.priority === "ALTA" ? 2 : 5));
    if (occurrence.responsibleUserId) initial.assignee = `user:${occurrence.responsibleUserId}`;
    const tpl = options.templates.find((t) => t.type === initial.type);
    if (tpl) initial.checklist = tpl.items.map((i) => ({ ...i }));
  }

  return (
    <>
      <PageHeader
        title={occurrence ? "Converter ocorrência em tarefa" : "Nova tarefa"}
        subtitle={occurrence ? `${occurrenceCode(occurrence.number)} · as fotos da ocorrência serão anexadas como "antes"` : "Planeje a manutenção e distribua para um jardineiro ou equipe."}
        back={occurrence ? "/ocorrencias" : "/tarefas"}
      />
      {occurrence && occurrence.photos.length > 0 && (
        <div className="card card-pad mb-4">
          <p className="mb-2 text-sm font-semibold text-stone-700">Fotos da ocorrência</p>
          <PhotoGallery photos={occurrence.photos.map(toPhotoView)} columns="grid-cols-4 sm:grid-cols-8" />
        </div>
      )}
      <TaskForm options={options} initial={initial} origin={occurrence ? "OCORRENCIA" : param(sp, "origem") === "QRCODE" ? "QRCODE" : "MANUAL"} occurrenceId={occurrence?.status === "ABERTA" ? occurrence.id : undefined} />
    </>
  );
}
