import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isLeader } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { buildReportPdf, buildReportXlsx, reportFileName } from "@/lib/report-export";
import { computeReport } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isLeader(user)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const format = sp.formato === "xlsx" ? "xlsx" : "pdf";
  const data = await computeReport(sp);

  const body = format === "pdf" ? buildReportPdf(data, user.name) : await buildReportXlsx(data, user.name);
  const fileName = reportFileName(format, data.generatedAt);

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

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
