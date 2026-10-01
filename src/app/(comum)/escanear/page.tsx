import { redirect } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { param, type SearchParams } from "@/lib/queries";

export const metadata = { title: "Ler QR Code" };

export default async function ScanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const sp = await searchParams;
  const code = param(sp, "codigo").trim().toUpperCase();
  let notFoundCode = "";
  if (code) {
    const loc = await db.location.findFirst({ where: { OR: [{ code }, { qrCode: { token: param(sp, "codigo").trim() } }] }, include: { qrCode: true } });
    if (loc?.qrCode) redirect(`/l/${loc.qrCode.token}`);
    notFoundCode = code;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="page-title">Ler QR Code</h1>
        <p className="mt-0.5 text-sm text-stone-500">Escaneie a placa do local para ver as tarefas e o histórico.</p>
      </div>
      {notFoundCode && <p className="rounded-[10px] bg-red-50 p-3 text-sm text-red-800" role="alert">Nenhum local encontrado com o código {notFoundCode}.</p>}
      <QrScanner />
    </div>
  );
}
