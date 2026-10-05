import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isLeader } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { computeReport } from "@/lib/reports";

/**
 * Calcula os dados do relatório e registra a exportação. O arquivo PDF/XLSX é
 * montado no navegador (src/components/report-export-buttons.tsx), o que mantém
 * as bibliotecas de geração fora do servidor.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isLeader(user)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const format = sp.formato === "xlsx" ? "xlsx" : "pdf";
  const data = await computeReport(sp);

  const { formato: _formato, ...filters } = sp;
  const report = await db.report.create({
    data: {
      title: `Relatório de manutenções · ${data.filters["Período"]}`,
      format: format.toUpperCase(),
      filters: JSON.stringify(filters),
      summary: JSON.stringify(data.indicators),
      generatedById: user.id,
    },
  });
  await audit({ entityType: "REPORT", entityId: report.id, action: "EXPORTADO", summary: `Relatório ${format.toUpperCase()} gerado (${data.indicators.total} tarefas)`, userId: user.id, details: data.filters });

  return NextResponse.json({ data, userName: user.name }, { headers: { "Cache-Control": "no-store" } });
}
