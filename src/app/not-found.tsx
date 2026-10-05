import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/ui";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo />
      <div className="card mt-6 flex w-full max-w-md flex-col items-center px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ds-tint-soft)] text-[var(--ds-tint)]">
          <SearchX className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-[20px] font-semibold leading-7 text-[var(--ds-label)]">Página não encontrada</h1>
        <p className="mt-1.5 text-sm text-[var(--ds-label-2)]">O endereço pode ter mudado ou o registro foi removido.</p>
        <Link href="/" className="btn-primary mt-6">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
