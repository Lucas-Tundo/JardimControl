"use client";

import dynamic from "next/dynamic";
import { FileSpreadsheet, FileText } from "lucide-react";

// ssr: false mantém exceljs/jspdf fora do bundle do servidor (limite de tamanho do Worker).
export const ReportExportButtons = dynamic(() => import("./report-export-actions").then((m) => m.ReportExportActions), {
  ssr: false,
  loading: () => (
    <>
      <button className="btn-primary" disabled>
        <FileText /> Exportar PDF
      </button>
      <button className="btn-secondary" disabled>
        <FileSpreadsheet /> Exportar Excel
      </button>
    </>
  ),
});
