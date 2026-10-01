import Link from "next/link";
import { Camera, Pencil, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocationOverview } from "@/lib/location-data";
import { LocationLeaderView } from "@/components/location-views";
import { LocationPhotoUpload } from "@/components/location-forms";
import { QrCard } from "@/components/qr-card";
import { PageHeader, Section } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loc = await getLocationOverview({ id });
  return { title: loc?.name ?? "Local" };
}

export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loc = await getLocationOverview({ id });
  if (!loc) notFound();

  return (
    <>
      <PageHeader
        back="/locais"
        title={loc.name}
        subtitle={`${loc.area.name} · ${loc.code}${loc.active ? "" : " · Inativo"}`}
        actions={
          <>
            <Link href={`/locais/${id}/editar`} className="btn-secondary"><Pencil /> Editar</Link>
            <Link href={`/tarefas/nova?local=${id}`} className="btn-secondary"><Plus /> Nova tarefa</Link>
            <Link href={`/ronda?local=${id}`} className="btn-primary"><Camera /> Registrar manutenção</Link>
          </>
        }
      />
      <LocationLeaderView loc={loc} qr={<QrCard location={loc} />} />
      <Section title="Adicionar fotos de referência do local" className="mt-4">
        <LocationPhotoUpload locationId={id} />
      </Section>
    </>
  );
}
