import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MAINTENANCE_TYPES, OCCURRENCE_STATUS, OCCURRENCE_TYPES, PRIORITIES, TASK_STATUS, labelOf } from "./constants";
import { formatDate, formatDateTime, formatDuration } from "./dates";
import type { ReportData, ReportGroupRow } from "./reports";
import { assigneeName, isLate, occurrenceCode, taskCode } from "./tasks";

const GREEN: [number, number, number] = [21, 128, 61];

/** As fontes padrão do PDF usam WinAnsi: remove emojis e troca travessões. */
function pdfText(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\u0000-\u00ff]/g, "")
    .trim();
}

function statusLabel(t: { status: string; dueAt: Date }, now: Date): string {
  if (isLate(t, now) && t.status !== "ATRASADA") return `${labelOf(TASK_STATUS, t.status)} (atrasada)`;
  return labelOf(TASK_STATUS, t.status);
}

function groupRows(rows: ReportGroupRow[]) {
  return rows.map((r) => [pdfText(r.label), r.total, r.done, r.open, r.late, formatDuration(r.avgMinutes), formatDuration(r.minutes)]);
}

export function buildReportPdf(data: ReportData, userName: string): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const now = data.generatedAt;
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 20;

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Jardim Control - Relatório de manutenções", 12, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfText(`Gerado em ${formatDateTime(now)} por ${userName}`), W - 12, 14, { align: "right" });

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const filterText = Object.entries(data.filters)
    .map(([k, v]) => `${k}: ${v}`)
    .join("   |   ");
  doc.text(pdfText(filterText), 12, 29);

  const i = data.indicators;
  autoTable(doc, {
    startY: 33,
    theme: "grid",
    head: [["Total", "Concluídas", "Pendentes", "Em andamento", "Aguard. aprovação", "Atrasadas", "Canceladas", "Taxa de conclusão", "Tempo médio", "Tempo total", "Ocorrências", "Devoluções"]],
    body: [[i.total, i.concluidas, i.pendentes, i.emAndamento, i.aguardando, i.atrasadas, i.canceladas, `${i.taxaConclusao}%`, formatDuration(i.tempoMedio), formatDuration(i.tempoTotal), `${i.ocorrencias} (${i.ocorrenciasAbertas} abertas)`, i.devolucoes]],
    headStyles: { fillColor: GREEN, fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 11, fontStyle: "bold", halign: "center" },
  });

  const groupHead = [["", "Total", "Concluídas", "Abertas", "Atrasadas", "Tempo médio", "Tempo total"]];
  const half = (W - 24 - 6) / 2;
  const y0 = lastY() + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Manutenções por área", 12, y0);
  doc.text("Por jardineiro / equipe", 12 + half + 6, y0);
  autoTable(doc, { startY: y0 + 2, head: [["Área", ...groupHead[0].slice(1)]], body: groupRows(data.byArea), theme: "striped", headStyles: { fillColor: GREEN, fontSize: 8 }, bodyStyles: { fontSize: 8 }, margin: { left: 12, right: W - 12 - half } });
  const yA = lastY();
  autoTable(doc, { startY: y0 + 2, head: [["Responsável", ...groupHead[0].slice(1)]], body: groupRows(data.byAssignee), theme: "striped", headStyles: { fillColor: GREEN, fontSize: 8 }, bodyStyles: { fontSize: 8 }, margin: { left: 12 + half + 6, right: 12 } });
  const yB = lastY();

  let y = Math.max(yA, yB) + 8;
  doc.text("Por tipo de serviço", 12, y);
  doc.text("Por status e prioridade", 12 + half + 6, y);
  autoTable(doc, { startY: y + 2, head: [["Tipo", ...groupHead[0].slice(1)]], body: groupRows(data.byType), theme: "striped", headStyles: { fillColor: GREEN, fontSize: 8 }, bodyStyles: { fontSize: 8 }, margin: { left: 12, right: W - 12 - half } });
  const yC = lastY();
  autoTable(doc, {
    startY: y + 2,
    head: [["Status", "Qtd.", "Prioridade", "Qtd."]],
    body: Array.from({ length: Math.max(data.byStatus.length, data.byPriority.length) }, (_, k) => [data.byStatus[k]?.label ?? "", data.byStatus[k]?.count ?? "", data.byPriority[k]?.label ?? "", data.byPriority[k]?.count ?? ""]),
    theme: "striped",
    headStyles: { fillColor: GREEN, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 12 + half + 6, right: 12 },
  });
  y = Math.max(yC, lastY()) + 8;

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Tarefas (${data.tasks.length})`, 12, 14);
  autoTable(doc, {
    startY: 18,
    head: [["Código", "Programada", "Local", "Área", "Serviço", "Responsável", "Prioridade", "Status", "Início", "Fim", "Tempo", "Aprovada por"]],
    body: data.tasks.map((t) => [
      taskCode(t.number),
      formatDateTime(t.scheduledAt),
      pdfText(t.location.name),
      pdfText(t.area.name),
      pdfText(labelOf(MAINTENANCE_TYPES, t.type)),
      pdfText(assigneeName(t)),
      labelOf(PRIORITIES, t.priority),
      pdfText(statusLabel(t, now)),
      t.startedAt ? formatDateTime(t.startedAt) : "-",
      t.finishedAt ? formatDateTime(t.finishedAt) : "-",
      formatDuration(t.totalMinutes),
      pdfText(t.approvedBy?.name ?? "-"),
    ]),
    theme: "striped",
    headStyles: { fillColor: GREEN, fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 12, right: 12 },
  });

  if (data.occurrences.length) {
    y = lastY() + 10;
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 14;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Ocorrências (${data.occurrences.length})`, 12, y);
    autoTable(doc, {
      startY: y + 4,
      head: [["Código", "Data", "Local", "Tipo", "Descrição", "Prioridade", "Status", "Registrada por"]],
      body: data.occurrences.map((o) => [
        occurrenceCode(o.number),
        formatDateTime(o.createdAt),
        pdfText(o.location.name),
        pdfText(labelOf(OCCURRENCE_TYPES, o.type)),
        pdfText(o.description),
        labelOf(PRIORITIES, o.priority),
        pdfText(labelOf(OCCURRENCE_STATUS, o.status)),
        pdfText(o.reportedBy.name),
      ]),
      theme: "striped",
      headStyles: { fillColor: GREEN, fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: { 4: { cellWidth: 80 } },
      margin: { left: 12, right: 12 },
    });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Jardim Control  -  página ${p} de ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

function styleHeader(ws: ExcelJS.Worksheet, filter = true) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (filter) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

function groupSheet(wb: ExcelJS.Workbook, name: string, label: string, rows: ReportGroupRow[]) {
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { header: label, key: "label", width: 34 },
    { header: "Total", key: "total", width: 10 },
    { header: "Concluídas", key: "done", width: 12 },
    { header: "Abertas", key: "open", width: 10 },
    { header: "Atrasadas", key: "late", width: 11 },
    { header: "Tempo médio (min)", key: "avg", width: 18 },
    { header: "Tempo total (min)", key: "min", width: 18 },
  ];
  rows.forEach((r) => ws.addRow({ label: r.label, total: r.total, done: r.done, open: r.open, late: r.late, avg: r.avgMinutes, min: r.minutes }));
  styleHeader(ws);
}

export async function buildReportXlsx(data: ReportData, userName: string): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Jardim Control";
  wb.created = data.generatedAt;
  const now = data.generatedAt;
  const i = data.indicators;

  const summary = wb.addWorksheet("Resumo");
  summary.columns = [
    { header: "Indicador", key: "k", width: 34 },
    { header: "Valor", key: "v", width: 40 },
  ];
  const rows: [string, string | number][] = [
    ["Relatório", "Jardim Control - Relatório de manutenções"],
    ["Gerado em", formatDateTime(now)],
    ["Gerado por", userName],
    ...Object.entries(data.filters),
    ["", ""],
    ["Total de tarefas", i.total],
    ["Concluídas", i.concluidas],
    ["Pendentes / programadas", i.pendentes],
    ["Em andamento", i.emAndamento],
    ["Aguardando aprovação", i.aguardando],
    ["Atrasadas", i.atrasadas],
    ["Canceladas", i.canceladas],
    ["Taxa de conclusão", `${i.taxaConclusao}%`],
    ["Tempo médio de execução", formatDuration(i.tempoMedio)],
    ["Tempo total de execução", formatDuration(i.tempoTotal)],
    ["Ocorrências registradas", i.ocorrencias],
    ["Ocorrências abertas", i.ocorrenciasAbertas],
    ["Devoluções para correção", i.devolucoes],
  ];
  rows.forEach(([k, v]) => summary.addRow({ k, v }));
  styleHeader(summary, false);

  const tasks = wb.addWorksheet("Tarefas");
  tasks.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Título", key: "title", width: 40 },
    { header: "Local", key: "loc", width: 30 },
    { header: "Área", key: "area", width: 22 },
    { header: "Serviço", key: "type", width: 20 },
    { header: "Responsável", key: "resp", width: 24 },
    { header: "Prioridade", key: "prio", width: 11 },
    { header: "Status", key: "status", width: 24 },
    { header: "Programada", key: "sched", width: 17 },
    { header: "Prazo", key: "due", width: 17 },
    { header: "Início", key: "start", width: 17 },
    { header: "Fim", key: "end", width: 17 },
    { header: "Tempo (min)", key: "min", width: 12 },
    { header: "Tempo", key: "dur", width: 9 },
    { header: "Devoluções", key: "ret", width: 11 },
    { header: "Criada por", key: "by", width: 20 },
    { header: "Aprovada por", key: "appr", width: 20 },
    { header: "Aprovada em", key: "apprAt", width: 17 },
  ];
  data.tasks.forEach((t) =>
    tasks.addRow({
      code: taskCode(t.number),
      title: t.title,
      loc: t.location.name,
      area: t.area.name,
      type: labelOf(MAINTENANCE_TYPES, t.type),
      resp: assigneeName(t),
      prio: labelOf(PRIORITIES, t.priority),
      status: statusLabel(t, now),
      sched: formatDateTime(t.scheduledAt),
      due: formatDateTime(t.dueAt),
      start: t.startedAt ? formatDateTime(t.startedAt) : "",
      end: t.finishedAt ? formatDateTime(t.finishedAt) : "",
      min: t.totalMinutes || null,
      dur: t.totalMinutes ? formatDuration(t.totalMinutes) : "",
      ret: t.returnCount,
      by: t.createdBy.name,
      appr: t.approvedBy?.name ?? "",
      apprAt: t.approvedAt ? formatDateTime(t.approvedAt) : "",
    }),
  );
  styleHeader(tasks);

  groupSheet(wb, "Por área", "Área", data.byArea);
  groupSheet(wb, "Por responsável", "Jardineiro / equipe", data.byAssignee);
  groupSheet(wb, "Por tipo", "Tipo de serviço", data.byType);

  const occ = wb.addWorksheet("Ocorrências");
  occ.columns = [
    { header: "Código", key: "code", width: 10 },
    { header: "Data", key: "date", width: 17 },
    { header: "Local", key: "loc", width: 30 },
    { header: "Tipo", key: "type", width: 22 },
    { header: "Descrição", key: "desc", width: 60 },
    { header: "Prioridade", key: "prio", width: 11 },
    { header: "Status", key: "status", width: 18 },
    { header: "Registrada por", key: "by", width: 22 },
  ];
  data.occurrences.forEach((o) =>
    occ.addRow({
      code: occurrenceCode(o.number),
      date: formatDateTime(o.createdAt),
      loc: o.location.name,
      type: labelOf(OCCURRENCE_TYPES, o.type),
      desc: o.description,
      prio: labelOf(PRIORITIES, o.priority),
      status: labelOf(OCCURRENCE_STATUS, o.status),
      by: o.reportedBy.name,
    }),
  );
  styleHeader(occ);

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export function reportFileName(ext: "pdf" | "xlsx", now = new Date()): string {
  return `jardim-control-relatorio-${formatDate(now).split("/").reverse().join("-")}.${ext}`;
}
