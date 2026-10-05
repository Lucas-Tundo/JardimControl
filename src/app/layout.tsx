import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConfirmProvider } from "@/components/dialog";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: { default: "Jardim Control", template: "%s · Jardim Control" },
  description: "Gestão de tarefas de jardinagem e manutenção de áreas verdes",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Jardim Control", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f6b45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body data-ds="">
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
