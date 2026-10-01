import Link from "next/link";
import { Camera, FileText, QrCode, TriangleAlert } from "lucide-react";
import { isLeader, type SessionUser } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import { summarizeLocation, type LocationOverview } from "@/lib/location-data";
import { toPhotoView } from "@/lib/queries";
import { isLate } from "@/lib/tasks";
import { LocationLeaderView, OccurrenceList } from "./location-views";
import { PhotoGallery } from "./photos";
import { QrTaskPicker } from "./qr-task-picker";
import { TypeLabel } from "./ui";

/** Tela aberta ao escanear o QR Code do local · conteúdo muda conforme o perfil. */
export function LocationFieldView({ loc, user, viaQr }: { loc: LocationOverview; user: SessionUser; viaQr?: boolean }) {
  const header = (
    <div className="card card-pad">
      {viaQr && (
        <p className="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
          <QrCode className="h-3.5 w-3.5" aria-hidden /> QR Code lido
        </p>
      )}
      <h1 className="page-title">{loc.name}</h1>
      <p className="mt-1 text-sm tabular-nums text-stone-500">
        {loc.code} · {loc.area.name}
      </p>
      {loc.description && <p className="mt-2 text-sm text-stone-700">{loc.description}</p>}
    </div>
  );

  if (isLeader(user)) {
    return (
      <div className="space-y-3">
        {header}
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link href={`/ronda?local=${loc.id}`} className="btn-xl btn-primary">
            <Camera /> Registrar manutenção
          </Link>
          <Link href={`/locais/${loc.id}`} className="btn-xl btn-secondary">
            <FileText /> Ficha completa do local
          </Link>
        </div>
        <LocationLeaderView loc={loc} compact />
      </div>
    );
  }

  const now = new Date();
  const s = summarizeLocation(loc, now);
  const mine = s.open.filter(
    (t) =>
      ["PROGRAMADA", "PENDENTE", "ATRASADA", "EM_ANDAMENTO"].includes(t.status) &&
      (t.assigneeUser?.id === user.id || (!!t.assigneeTeam && user.teamIds.includes(t.assigneeTeam.id))),
  );
  const actionable = mine
    .filter((t) => t.status !== "PROGRAMADA" || t.scheduledAt.getTime() <= now.getTime() + 7 * 86400000)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const upcoming = s.open.filter((t) => t.status === "PROGRAMADA").sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()).slice(0, 3);

  return (
    <div className="space-y-3">
      {header}

      <section>
        <h2 className="mb-2 mt-2 text-[20px] font-semibold text-stone-900">Suas tarefas aqui</h2>
        {actionable.length === 0 ? (
          <p className="card p-4 text-base text-stone-600">Você não tem tarefas para este local agora.</p>
        ) : (
          <QrTaskPicker
            tasks={actionable.map((t) => ({
              id: t.id,
              type: t.type,
              title: t.title,
              priority: t.priority,
              status: t.status,
              late: isLate(t, now),
              scheduledAt: t.scheduledAt,
              checklist: t.checklist.map((c) => ({ text: c.text, required: c.required, done: c.done })),
            }))}
          />
        )}
      </section>

      <section className="card card-pad">
        <h2 className="section-title mb-2">Próximas manutenções</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-stone-500">Nada programado.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 text-base">
                <TypeLabel type={t.type} />
                <span className="tabular-nums text-stone-600">
                  {formatDate(t.scheduledAt)} {formatTime(t.scheduledAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {s.lastCompleted && <p className="mt-2 text-xs text-stone-500">Última manutenção: {formatDate(s.lastCompleted.approvedAt)}</p>}
      </section>

      <section className="card card-pad">
        <h2 className="section-title mb-2">Fotos de referência</h2>
        <PhotoGallery photos={loc.photos.map(toPhotoView)} emptyText="Sem fotos de referência." columns="grid-cols-2 sm:grid-cols-3" />
      </section>

      <section className="card card-pad">
        <h2 className="section-title mb-2">Ocorrências abertas <span className="font-normal tabular-nums text-stone-500">{s.openOccurrences.length}</span></h2>
        <OccurrenceList occurrences={s.openOccurrences} />
      </section>

      <Link href={`/ocorrencia/nova?local=${loc.id}`} className="btn-xl btn-secondary text-amber-800">
        <TriangleAlert /> Registrar problema aqui
      </Link>
    </div>
  );
}
