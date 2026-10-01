import { redirect } from "next/navigation";
import { getCurrentUser, isLeader } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") ? next : isLeader(user) ? "/painel" : "/minhas-tarefas");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--ds-bg)] px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex rounded-[14px] bg-brand-700 px-4 py-2.5">
            <Logo light />
          </span>
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-stone-900">Entrar</h1>
          <p className="mb-5 mt-1 text-sm text-stone-500">Use o usuário e a senha fornecidos pela liderança.</p>
          <LoginForm next={next ?? ""} />
        </div>
        <div className="mt-4 rounded-[14px] bg-white/60 p-4 text-sm text-stone-600">
          <p className="mb-1.5 font-medium text-stone-900">Acessos de demonstração</p>
          <p>
            Liderança: <code>admin</code> / <code>admin123</code> ou <code>lider</code> / <code>lider123</code>
          </p>
          <p className="mt-1">
            Jardineiros: <code>joao</code>, <code>carlos</code>, <code>maria</code> ou <code>pedro</code> / <code>123456</code>
          </p>
        </div>
      </div>
    </div>
  );
}
