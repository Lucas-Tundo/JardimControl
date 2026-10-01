import { notFound } from "next/navigation";
import { LocationFieldView } from "@/components/location-field-view";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocationOverview } from "@/lib/location-data";

export const metadata = { title: "Local" };

export default async function QrLocationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser();
  const qr = await db.qrCode.findUnique({ where: { token } });
  if (!qr) notFound();

  await db.qrCode.update({ where: { id: qr.id }, data: { scans: { increment: 1 }, lastScanAt: new Date() } });
  const loc = await getLocationOverview({ id: qr.locationId });
  if (!loc) notFound();
  if (!loc.active) {
    return <EmptyState title="Local desativado">Este QR Code pertence a um local que não está mais ativo.</EmptyState>;
  }
  return <LocationFieldView loc={loc} user={user} viaQr />;
}
