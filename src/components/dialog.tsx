"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { TriangleAlert, X } from "lucide-react";
import { cn } from "./ui";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DIALOG_WIDTH = { sm: "sm:max-w-[460px]", md: "sm:max-w-[680px]", lg: "sm:max-w-[1050px]" } as const;
const DRAWER_WIDTH = { sm: "max-w-[520px]", md: "max-w-[640px]", lg: "max-w-[640px]" } as const;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  kicker?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Rodapé fixo fora da área que rola (ações separadas por 10 px). */
  footer?: ReactNode;
  variant?: "dialog" | "drawer";
  side?: "right" | "left";
  size?: keyof typeof DIALOG_WIDTH;
  /** Use false enquanto salva para o clique no fundo não descartar o formulário. */
  closeOnBackdrop?: boolean;
  /** Compatibilidade: equivale a size="md". */
  wide?: boolean;
  /** Painel sem cabeçalho padrão (o conteúdo desenha o próprio topo). */
  bare?: boolean;
  panelClassName?: string;
  bodyClassName?: string;
  role?: "dialog" | "alertdialog";
};

/** Única camada sobreposta do sistema: fundo escuro, cartão com cabeçalho, corpo que rola e rodapé. */
export function Dialog({
  open,
  onClose,
  title,
  kicker,
  description,
  children,
  footer,
  variant = "dialog",
  side = "right",
  size,
  closeOnBackdrop = true,
  wide,
  bare,
  panelClassName,
  bodyClassName,
  role = "dialog",
}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const width = size ?? (wide ? "md" : "sm");

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const first =
      node?.querySelector<HTMLElement>("[data-autofocus]") ??
      node?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea") ??
      node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const start = items[0];
      const end = items[items.length - 1];
      if (e.shiftKey && document.activeElement === start) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        start.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const drawer = variant === "drawer";
  return (
    <div
      className={cn(
        "ds-scrim fixed inset-0 z-50 flex bg-[var(--ds-scrim)]",
        drawer ? (side === "left" ? "justify-start" : "justify-end") : "items-end justify-center sm:items-center sm:p-4",
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "flex w-full flex-col bg-[var(--ds-surface)] shadow-[var(--ds-shadow-3)]",
          drawer
            ? cn("h-dvh", side === "left" ? "ds-drawer-left" : "ds-drawer-right", DRAWER_WIDTH[width])
            : cn("ds-dialog max-h-[92dvh] rounded-t-[var(--ds-radius-2xl)] sm:rounded-[var(--ds-radius-xl)]", DIALOG_WIDTH[width]),
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {bare ? (
          <span id={titleId} className="sr-only">
            {title}
          </span>
        ) : (
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {kicker && <p className="kicker mb-0.5">{kicker}</p>}
              <h2 id={titleId} className="text-[20px] font-semibold leading-7 tracking-[-0.014em] text-[var(--ds-label)]">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-[var(--ds-label-2)]">
                  {description}
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} className="btn-icon -mr-1 shrink-0" aria-label="Fechar">
              <X />
            </button>
          </div>
        )}
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", !bare && "px-5 pb-5 sm:px-6 sm:pb-6", bodyClassName)}>{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-[var(--ds-separator)] px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

/** Rodapé de ações dentro do corpo (formulários): fica preso embaixo enquanto o corpo rola. */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--ds-separator)] bg-[var(--ds-surface)] px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Confirmação centrada (role="alertdialog") no lugar do confirm() do navegador. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const ask = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const danger = pending?.tone !== "default";
  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Dialog open={!!pending} onClose={() => settle(false)} title={pending?.title ?? ""} role="alertdialog" bare panelClassName="sm:max-w-[420px]">
        {pending && (
          <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                danger ? "bg-[color-mix(in_srgb,var(--ds-red)_10%,transparent)] text-[var(--ds-red)]" : "bg-[var(--ds-tint-soft)] text-[var(--ds-tint)]",
              )}
            >
              <TriangleAlert className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-[20px] font-semibold leading-7 text-[var(--ds-label)]">{pending.title}</h2>
            {pending.description && <p className="mt-1.5 text-sm text-[var(--ds-label-2)]">{pending.description}</p>}
            <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
              <button type="button" data-autofocus className="btn-secondary" onClick={() => settle(false)}>
                {pending.cancelLabel ?? "Cancelar"}
              </button>
              <button type="button" className={danger ? "btn-danger" : "btn-primary"} onClick={() => settle(true)}>
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>.");
  return ask;
}
