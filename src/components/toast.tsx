"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };
type ToastApi = { show: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });

const TONES = {
  success: { icon: CircleCheck, color: "text-green-400" },
  error: { icon: CircleAlert, color: "text-red-400" },
  info: { icon: Info, color: "text-white/70" },
} as const;

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, color } = TONES[t.tone];
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-[14px] bg-stone-900/95 px-4 py-3 text-sm font-medium text-white shadow-[var(--ds-shadow-3)] backdrop-blur-md">
              <Icon className={`mt-px h-[18px] w-[18px] shrink-0 ${color}`} aria-hidden />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
