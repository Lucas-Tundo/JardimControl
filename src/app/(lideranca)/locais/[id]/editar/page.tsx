import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getFormOptions } from "@/lib/queries";
import { LocationForm } from "@/components/location-forms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Editar local" };

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [loc, options] = await Promise.all([db.location.findUnique({ where: { id } }), getFormOptions()]);
  if (!loc) notFound();
  return (
    <>
      <PageHeader title={`Editar ${loc.name}`} back={`/locais/${id}`} />
      <LocationForm
        options={options}
        initial={{
          ...loc,
          responsible: loc.responsibleUserId ? `user:${loc.responsibleUserId}` : loc.responsibleTeamId ? `team:${loc.responsibleTeamId}` : "",
        }}
      />
    </>
  );
}
