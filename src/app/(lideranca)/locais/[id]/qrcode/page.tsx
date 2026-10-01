import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { QrLabel } from "@/components/qr-label";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Etiqueta QR Code" };

export default async function LocationQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loc = await db.location.findUnique({ where: { id }, include: { area: true, qrCode: true } });
  if (!loc || !loc.qrCode) notFound();
  return (
    <>
      <div className="no-print">
        <PageHeader title="Etiqueta do QR Code" subtitle="Imprima e fixe no local." back={`/locais/${id}`} actions={<PrintButton />} />
      </div>
      <div className="mx-auto max-w-sm">
        <QrLabel name={loc.name} code={loc.code} area={loc.area.name} token={loc.qrCode.token} />
      </div>
    </>
  );
}
