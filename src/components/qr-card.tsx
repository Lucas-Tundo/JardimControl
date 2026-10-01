import Link from "next/link";
import { Printer } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { locationQrUrl, qrSvg } from "@/lib/qr";
import { QrAdminButtons } from "./location-forms";

export async function QrCard({ location }: { location: { id: string; name: string; code: string; active: boolean; qrCode: { token: string; scans: number; lastScanAt: Date | null } | null } }) {
  if (!location.qrCode) return null;
  const url = await locationQrUrl(location.qrCode.token);
  const svg = await qrSvg(url);
  const { scans, lastScanAt } = location.qrCode;
  return (
    <section className="card card-pad text-center">
      <h2 className="section-title mb-3 text-left">QR Code do local</h2>
      <div className="mx-auto w-48 rounded-[10px] border border-stone-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-3 text-base font-semibold text-stone-900">{location.name}</p>
      <p className="text-xs tabular-nums text-stone-500">{location.code}</p>
      <p className="mt-1 break-all text-xs text-stone-400" title={url}>{url}</p>
      <p className="mt-1 text-xs text-stone-500">
        {scans === 0 ? "Nenhuma leitura ainda" : scans === 1 ? "1 leitura" : `${scans} leituras`}
        {lastScanAt && ` · última em ${formatDateTime(lastScanAt)}`}
      </p>
      <div className="mt-4 flex flex-col items-center gap-2.5">
        <Link href={`/locais/${location.id}/qrcode`} className="btn-primary w-full">
          <Printer /> Imprimir etiqueta
        </Link>
        <QrAdminButtons locationId={location.id} active={location.active} />
      </div>
    </section>
  );
}
