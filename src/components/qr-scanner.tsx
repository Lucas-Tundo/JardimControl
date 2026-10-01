"use client";

import jsQR from "jsqr";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { useToast } from "./toast";

function targetFor(value: string): string {
  const text = value.trim();
  const m = text.match(/\/l\/([A-Za-z0-9_-]+)/);
  if (m) return `/l/${m[1]}`;
  return `/escanear?codigo=${encodeURIComponent(text)}`;
}

export function QrScanner() {
  const router = useRouter();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState<"idle" | "on" | "unsupported" | "denied">("idle");
  const [code, setCode] = useState("");
  const [found, setFound] = useState(false);

  const handle = useCallback(
    (value: string) => {
      setFound(true);
      router.push(targetFor(value));
    },
    [router],
  );

  useEffect(() => {
    if (live !== "on") return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const tick = () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          if (canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (result?.data) {
              stopped = true;
              handle(result.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setLive("denied");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [live, handle]);

  const startLive = () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return setLive("unsupported");
    setLive("on");
  };

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(img.data, img.width, img.height);
    if (fileRef.current) fileRef.current.value = "";
    if (!result?.data) return toast.show("Não encontrei um QR Code na foto. Tente de novo, mais perto e com boa luz.", "error");
    handle(result.data);
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[18px] bg-stone-900">
        {live === "on" ? (
          <>
            <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-10 rounded-[18px] border-2 border-white/85 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            <p className="absolute inset-x-0 bottom-3 text-center text-sm font-medium text-white">{found ? "QR Code lido. Abrindo…" : "Aponte para o QR Code do local"}</p>
          </>
        ) : (
          <button type="button" onClick={startLive} className="flex aspect-square w-full flex-col items-center justify-center gap-3 text-white">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <ScanLine className="h-8 w-8" aria-hidden />
            </span>
            <span className="text-[22px] font-semibold">Abrir câmera</span>
            <span className="px-8 text-center text-sm text-white/70">Aponte para a placa com o QR Code do local</span>
          </button>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {(live === "unsupported" || live === "denied") && (
        <p className="rounded-[10px] bg-amber-50 p-3 text-sm text-amber-900">
          {live === "denied" ? "Não foi possível acessar a câmera ao vivo." : "A câmera ao vivo não está disponível neste endereço."} Use o botão abaixo para tirar uma foto do QR Code.
        </p>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => fromPhoto(e.target.files?.[0])} />
      <button type="button" className="btn-xl btn-primary" onClick={() => fileRef.current?.click()}>
        <Camera /> Tirar foto do QR Code
      </button>

      <form
        className="card card-pad space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) handle(code);
        }}
      >
        <label className="label" htmlFor="qr-code">Ou digite o código do local</label>
        <div className="flex gap-2.5">
          <input id="qr-code" className="input flex-1" placeholder="Ex.: EXT-EA" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" />
          <button className="btn-secondary px-5" type="submit">
            Abrir
          </button>
        </div>
      </form>
    </div>
  );
}
