import Link from "next/link";
import { db } from "@/lib/db";
import { requireLeader } from "@/lib/auth";
import { startOfDay } from "@/lib/dates";
import { getFormOptions, param, type SearchParams } from "@/lib/queries";
import { taskListInclude } from "@/lib/tasks";
import { RondaFlow } from "@/components/ronda-flow";
import { TaskTable } from "@/components/task-views";
import { PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Ronda de Jardinagem" };

export default async function RondaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireLeader();
  const sp = await searchParams;
  const [options, today] = await Promise.all([
    getFormOptions(),
    db.task.findMany({
      where: { deletedAt: null, origin: { in: ["RONDA", "QRCODE"] }, createdById: user.id, createdAt: { gte: startOfDay(new Date()) } },
      include: taskListInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const preset = param(sp, "local");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ronda de Jardinagem" subtitle="Registre necessidades de manutenção durante a inspeção presencial." />
      <RondaFlow options={options} presetLocationId={preset || undefined} />
      <Section title={`Registradas por você hoje (${today.length})`} className="mt-6">
        <TaskTable tasks={today} empty="Nenhum registro na ronda de hoje." />
        <p className="mt-3 text-xs text-stone-500">
          Dica: escaneie o <Link href="/escanear" className="font-semibold text-brand-700 underline">QR Code do local</Link> para identificá-lo automaticamente.
        </p>
      </Section>
    </div>
  );
}
