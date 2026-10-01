"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Camera, Check, CircleCheck, Pencil, Trash2, TriangleAlert, Undo2, XCircle } from "lucide-react";
import { addReferencePhotos, cancelTask, deleteTask } from "@/app/actions/tasks";
import { approveTask, returnTask } from "@/app/actions/execution";
import { Dialog } from "./dialog";
import { PendingPhotos, PhotoPicker } from "./photos";
import { useToast } from "./toast";

export function TaskLeaderActions({ taskId, status, isAdmin }: { taskId: string; status: string; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"" | "cancel" | "delete" | "photos">("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const closed = status === "CONCLUIDA" || status === "CANCELADA";

  const close = () => {
    setDialog("");
    setReason("");
    setPassword("");
    setFiles([]);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast.show(r.error ?? "Erro", "error");
      toast.show(r.message ?? "Feito.");
      close();
      if (after) after();
      else router.refresh();
    });

  return (
    <>
      {!closed && (
        <Link href={`/tarefas/${taskId}/editar`} className="btn-secondary">
          <Pencil /> Editar
        </Link>
      )}
      {!closed && (
        <button className="btn-secondary" onClick={() => setDialog("photos")}>
          <Camera /> Enviar fotos
        </button>
      )}
      {!closed && (
        <button className="btn-secondary" onClick={() => setDialog("cancel")}>
          <XCircle /> Cancelar
        </button>
      )}
      <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => setDialog("delete")}>
        <Trash2 /> Excluir
      </button>

      <Dialog open={dialog === "photos"} onClose={close} title="Enviar fotos de referência">
        <p className="mb-3 text-sm text-stone-600">As fotos entram como referência de antes e o responsável recebe um aviso.</p>
        <PendingPhotos files={files} onRemove={(i) => setFiles((f) => f.filter((_, idx) => idx !== i))} />
        <div className="mt-3">
          <PhotoPicker onFiles={(f) => setFiles((p) => [...p, ...f])} label="Tirar foto" />
        </div>
        <button
          className="btn-primary mt-4 w-full"
          disabled={pending || !files.length}
          onClick={() =>
            run(() => {
              const fd = new FormData();
              files.forEach((f) => fd.append("photos", f));
              return addReferencePhotos(taskId, fd);
            })
          }
        >
          {files.length === 0 ? "Enviar fotos" : files.length === 1 ? "Enviar 1 foto" : `Enviar ${files.length} fotos`}
        </button>
      </Dialog>

      <Dialog open={dialog === "cancel"} onClose={close} title="Cancelar tarefa">
        <label className="label">Motivo do cancelamento *</label>
        <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn-danger mt-4 w-full" disabled={pending || !reason.trim()} onClick={() => run(() => cancelTask(taskId, reason))}>
          Confirmar cancelamento
        </button>
      </Dialog>

      <Dialog open={dialog === "delete"} onClose={close} title="Excluir tarefa">
        {status === "CONCLUIDA" && !isAdmin ? (
          <p className="rounded-[10px] bg-amber-50 p-3 text-sm text-amber-900">
            Esta manutenção já foi concluída. A exclusão definitiva de registros concluídos exige autorização de um <strong>Administrador</strong>.
          </p>
        ) : (
          <div className="space-y-3">
            {status === "CONCLUIDA" ? (
              <p className="rounded-[10px] bg-red-50 p-3 text-sm text-red-800">
                Exclusão <strong>definitiva</strong> de manutenção concluída. As fotos continuarão no histórico do local e a exclusão ficará registrada na
                auditoria. Confirme com sua senha de administrador.
              </p>
            ) : (
              <p className="text-sm text-stone-600">A tarefa será removida das listas, mas o registro permanece na trilha de auditoria.</p>
            )}
            <div>
              <label className="label">Motivo *</label>
              <textarea className="input min-h-20" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            {status === "CONCLUIDA" && (
              <div>
                <label className="label">Senha do administrador *</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
            )}
            <button
              className="btn-danger w-full"
              disabled={pending || !reason.trim() || (status === "CONCLUIDA" && !password)}
              onClick={() => run(() => deleteTask(taskId, reason, password || undefined), () => router.push("/tarefas"))}
            >
              Excluir
            </button>
          </div>
        )}
      </Dialog>
    </>
  );
}

export function ApprovalPanel({ taskId, pendingRequired, afterPhotos }: { taskId: string; pendingRequired: number; afterPhotos: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [comment, setComment] = useState("");
  const [returning, setReturning] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return toast.show(r.error ?? "Erro", "error");
      toast.show(r.message ?? "Feito.");
      router.refresh();
    });

  return (
    <div className="card card-pad shadow-[inset_0_0_0_1.5px_theme(colors.violet.300),var(--ds-shadow-1)]">
      <h2 className="section-title">Serviço aguardando sua aprovação</h2>
      <p className="mt-1 text-sm text-stone-600">Compare as fotos de antes e depois e confira o checklist antes de decidir.</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className={`flex items-center gap-2 ${pendingRequired ? "text-red-700" : "text-green-700"}`}>
          {pendingRequired ? <TriangleAlert className="h-4 w-4" aria-hidden /> : <CircleCheck className="h-4 w-4" aria-hidden />}
          {pendingRequired ? `${pendingRequired} ${pendingRequired === 1 ? "item obrigatório pendente" : "itens obrigatórios pendentes"}` : "Checklist obrigatório completo"}
        </li>
        <li className={`flex items-center gap-2 ${afterPhotos ? "text-green-700" : "text-red-700"}`}>
          {afterPhotos ? <CircleCheck className="h-4 w-4" aria-hidden /> : <TriangleAlert className="h-4 w-4" aria-hidden />}
          {afterPhotos === 0 ? "Nenhuma foto de depois" : afterPhotos === 1 ? "1 foto de depois" : `${afterPhotos} fotos de depois`}
        </li>
      </ul>
      <textarea
        className="input mt-3 min-h-20"
        placeholder={returning ? "Descreva o que precisa ser corrigido (obrigatório)" : "Comentário (opcional)"}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <button className="btn-xl btn-primary" disabled={pending} onClick={() => run(() => approveTask(taskId, comment))}>
          <Check /> Aprovar e concluir
        </button>
        {returning ? (
          <button className="btn-xl btn-warning" disabled={pending || !comment.trim()} onClick={() => run(() => returnTask(taskId, comment))}>
            <Undo2 /> Confirmar devolução
          </button>
        ) : (
          <button className="btn-xl btn-secondary text-amber-800" disabled={pending} onClick={() => setReturning(true)}>
            <Undo2 /> Devolver para correção
          </button>
        )}
      </div>
    </div>
  );
}
