import { locationQrUrl, qrSvg } from "@/lib/qr";

/** Etiqueta imprimível: nome do local em destaque + QR Code. */
export async function QrLabel({ name, code, area, token }: { name: string; code: string; area: string; token: string }) {
  const url = await locationQrUrl(token);
  const svg = await qrSvg(url);
  return (
    <div className="flex break-inside-avoid flex-col items-center rounded-[14px] border-2 border-brand-700 bg-white p-5 text-center">
      <p className="mb-2 text-sm font-medium text-brand-700">Jardim Control</p>
      <div className="w-full max-w-56" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-3 text-xl font-semibold leading-tight text-stone-900">{name}</p>
      <p className="text-sm text-stone-600">
        {area} · {code}
      </p>
      <p className="mt-2 text-xs text-stone-500">Escaneie com o celular para ver as tarefas deste local</p>
    </div>
  );
}
