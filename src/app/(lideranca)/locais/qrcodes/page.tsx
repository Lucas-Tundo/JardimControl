import { db } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { QrLabel } from "@/components/qr-label";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "QR Codes dos locais" };

export default async function AllQrPage() {
  const locations = await db.location.findMany({ where: { active: true }, include: { area: true, qrCode: true }, orderBy: [{ area: { name: "asc" } }, { name: "asc" }] });
  return (
    <>
      <div className="no-print">
        <PageHeader title="QR Codes dos locais" subtitle={`${locations.length} etiquetas prontas para impressão.`} back="/locais" actions={<PrintButton label="Imprimir todas" />} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {locations.map((l) => l.qrCode && <QrLabel key={l.id} name={l.name} code={l.code} area={l.area.name} token={l.qrCode.token} />)}
      </div>
    </>
  );
}
