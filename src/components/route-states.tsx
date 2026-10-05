"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

/** Estado de erro de uma página: mensagem clara, tentar de novo e saída segura. */
export function RouteError({ error, retry, home }: { error: Error & { digest?: string }; retry: () => void; home: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="card mx-auto mt-6 flex max-w-md flex-col items-center px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ds-red)_10%,transparent)] text-[var(--ds-red)]">
        <TriangleAlert className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-[20px] font-semibold leading-7 text-[var(--ds-label)]">Não foi possível carregar esta página</h1>
      <p className="mt-1.5 text-sm text-[var(--ds-label-2)]">Verifique a conexão e tente de novo. Se o problema continuar, avise a liderança.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-[var(--ds-label-3)]">Código {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn-primary" onClick={retry}>
          <RotateCw /> Tentar de novo
        </button>
        <Link href={home} className="btn-secondary">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
