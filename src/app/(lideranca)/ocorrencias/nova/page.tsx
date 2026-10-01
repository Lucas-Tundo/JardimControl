import { getFormOptions, param, type SearchParams } from "@/lib/queries";
import { OccurrenceForm } from "@/components/occurrence-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Registrar ocorrência" };

export default async function NewOccurrenceLeaderPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const options = await getFormOptions();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Registrar ocorrência" back="/ocorrencias" />
      <OccurrenceForm options={options} presetLocationId={param(sp, "local") || undefined} leader redirectTo="/ocorrencias" />
    </div>
  );
}
