import { cn } from "./ui";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)]", className)} />;
}

/** Carregamento das páginas da liderança: mesma geometria de título, métricas e cartão. */
export function LeaderPageSkeleton() {
  return (
    <div role="status" aria-label="Carregando">
      <span className="sr-only">Carregando</span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-5 w-96 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-14" />
          </div>
        ))}
      </div>
      <div className="card card-pad mt-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Carregamento das telas do jardineiro: cartões de tarefa. */
export function GardenerPageSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-3">
      <span className="sr-only">Carregando</span>
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-4 h-14 w-full" />
        </div>
      ))}
    </div>
  );
}
