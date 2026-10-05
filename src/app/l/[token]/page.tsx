import { notFound, redirect } from "next/navigation";
import { LocationFieldView } from "@/components/location-field-view";
import { RoleShell } from "@/components/role-shell";
import { EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocationOverview } from "@/lib/location-data";

export const metadata = { title: "Local" };

/** Destino dos QR Codes: fica fora dos grupos com layout para levar o visitante ao login e trazê-lo de volta. */
export default async function QrLocationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/l/${token}`)}`);
  const qr = await db.qrCode.findUnique({ where: { token } });
  if (!qr) notFound();

  await db.qrCode.update({ where: { id: qr.id }, data: { scans: { increment: 1 }, lastScanAt: new Date() } });
  const loc = await getLocationOverview({ id: qr.locationId });
  if (!loc) notFound();
  return (
    <RoleShell user={user}>
      {loc.active ? (
        <LocationFieldView loc={loc} user={user} viaQr />
      ) : (
        <EmptyState title="Local desativado">Este QR Code pertence a um local que não está mais ativo.</EmptyState>
      )}
    </RoleShell>
  );
}
