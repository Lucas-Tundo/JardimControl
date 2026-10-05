"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import type { ReportData } from "@/lib/reports";
import { useToast } from "./toast";

type Format = "pdf" | "xlsx";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const reviveDates = (_key: string, value: unknown) => (typeof value === "string" && ISO_DATE.test(value) ? new Date(value) : value);

function download(bytes: Uint8Array, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportExportActions({ query }: { query: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<Format | null>(null);

  const run = async (format: Format) => {
    setBusy(format);
    try {
      const res = await fetch(`/api/relatorios/export?${query}${query ? "&" : ""}formato=${format}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const { data, userName } = JSON.parse(await res.text(), reviveDates) as { data: ReportData; userName: string };
      // Carregado só no clique: exceljs e jspdf são pesados e não entram no bundle inicial nem no servidor.
      const { buildReportPdf, buildReportXlsx, reportFileName } = await import("@/lib/report-export");
      if (format === "pdf") download(buildReportPdf(data, userName), "application/pdf", reportFileName("pdf", data.generatedAt));
      else download(await buildReportXlsx(data, userName), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", reportFileName("xlsx", data.generatedAt));
    } catch {
      toast.show("Não foi possível gerar o relatório. Tente novamente.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button className="btn-primary" disabled={busy !== null} onClick={() => run("pdf")}>
        <FileText /> {busy === "pdf" ? "Gerando..." : "Exportar PDF"}
      </button>
      <button className="btn-secondary" disabled={busy !== null} onClick={() => run("xlsx")}>
        <FileSpreadsheet /> {busy === "xlsx" ? "Gerando..." : "Exportar Excel"}
      </button>
    </>
  );
}
