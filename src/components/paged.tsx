"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./ui";

const PREVIEW = 10;
const EXPAND_LIMIT = 30;

/**
 * Listas longas: até 10 itens tudo visível; de 11 a 30, 10 e "Ver as outras N";
 * acima de 30, páginas de `pageSize` com "Anterior · 1 a 30 de N · Próxima".
 * Com `head`, os itens são linhas de uma tabela cujo cabeçalho fica preso ao topo no desktop.
 */
export function Paged({
  children,
  as = "ul",
  className,
  head,
  tableClassName,
  pageSize = 30,
  stickyHead = false,
}: {
  children: ReactNode;
  as?: "ul" | "div";
  className?: string;
  head?: ReactNode;
  tableClassName?: string;
  pageSize?: number;
  /** Cabeçalho preso ao topo a partir de 1180 px; só em tabelas que ocupam a largura da página. */
  stickyHead?: boolean;
}) {
  const items = Children.toArray(children);
  const total = items.length;
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [printing, setPrinting] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const paginated = total > EXPAND_LIMIT;
  const pages = Math.ceil(total / pageSize);
  const current = Math.min(page, pages - 1);
  const visible = printing
    ? items
    : paginated
      ? items.slice(current * pageSize, (current + 1) * pageSize)
      : expanded || total <= PREVIEW
        ? items
        : items.slice(0, PREVIEW);

  const go = (p: number) => {
    setPage(p);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const List = as;
  return (
    <div ref={top} className="scroll-mt-20">
      {head ? (
        <div className={stickyHead ? "max-[1179px]:overflow-x-auto" : "overflow-x-auto"}>
          <table className={cn("w-full text-sm", tableClassName)}>
            <thead className={cn(stickyHead && "min-[1180px]:sticky min-[1180px]:top-14 min-[1180px]:z-10 min-[1180px]:bg-[var(--ds-surface)]")}>{head}</thead>
            <tbody className={className}>{visible}</tbody>
          </table>
        </div>
      ) : (
        <List className={className}>{visible}</List>
      )}

      {!paginated && total > PREVIEW && (
        <div className="no-print mt-3 flex justify-center">
          <button type="button" className="btn-ghost text-[var(--ds-tint)]" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ver menos" : total - PREVIEW === 1 ? "Ver a outra" : `Ver as outras ${total - PREVIEW}`}
          </button>
        </div>
      )}

      {paginated && (
        <PageControls
          from={current * pageSize + 1}
          to={Math.min(total, (current + 1) * pageSize)}
          total={total}
          onPrev={current > 0 ? () => go(current - 1) : undefined}
          onNext={current < pages - 1 ? () => go(current + 1) : undefined}
        />
      )}
    </div>
  );
}

/** "Anterior · 1 a 30 de N · Próxima": usado também na paginação feita no servidor. */
export function PageControls({
  from,
  to,
  total,
  onPrev,
  onNext,
  prev,
  next,
}: {
  from: number;
  to: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  prev?: ReactNode;
  next?: ReactNode;
}) {
  return (
    <div className="no-print mt-4 flex items-center justify-between gap-2.5 border-t border-[var(--ds-separator)] pt-4 text-sm">
      {prev ?? (
        <button type="button" className="btn-secondary" disabled={!onPrev} onClick={onPrev}>
          <ChevronLeft /> Anterior
        </button>
      )}
      <span className="tabular-nums text-[var(--ds-label-2)]">
        {from} a {to} de {total}
      </span>
      {next ?? (
        <button type="button" className="btn-secondary" disabled={!onNext} onClick={onNext}>
          Próxima <ChevronRight />
        </button>
      )}
    </div>
  );
}
