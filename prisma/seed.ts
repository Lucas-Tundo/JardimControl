import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { addDays, dateKey, fromLocal } from "../src/lib/dates";
import { generateAllRecurrences } from "../src/lib/recurrence";

const db = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// ---------------------------------------------------------------------------
// Imagens ilustrativas (SVG) para os dados de demonstração
// ---------------------------------------------------------------------------
type Variant = "antes" | "depois" | "durante" | "ref" | "ocorrencia";

function sceneSvg(label: string, variant: Variant, seed: number): string {
  const rnd = (n: number) => {
    const x = Math.sin(seed * 999 + n * 77) * 10000;
    return x - Math.floor(x);
  };
  const messy = variant === "antes" || variant === "ocorrencia";
  const sky = variant === "ocorrencia" ? "#fde68a" : "#bae6fd";
  const grass = messy ? "#65a30d" : "#22c55e";
  const trees: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = 90 + i * 160 + rnd(i) * 40;
    const r = messy ? 70 + rnd(i + 10) * 30 : 55;
    const crown = messy
      ? `<circle cx="${x}" cy="${300 - r}" r="${r}" fill="#3f6212"/><circle cx="${x + r * 0.6}" cy="${320 - r}" r="${r * 0.7}" fill="#4d7c0f"/><circle cx="${x - r * 0.7}" cy="${330 - r}" r="${r * 0.6}" fill="#365314"/>`
      : `<circle cx="${x}" cy="${300 - r}" r="${r}" fill="#15803d"/>`;
    trees.push(`<rect x="${x - 8}" y="280" width="16" height="90" fill="#78350f"/>${crown}`);
  }
  const weeds = messy
    ? Array.from({ length: 40 }, (_, i) => {
        const x = rnd(i + 50) * 800;
        const y = 380 + rnd(i + 90) * 200;
        return `<path d="M${x} ${y} l6 -28 l6 28 z" fill="#a3a300" opacity=".8"/>`;
      }).join("")
    : Array.from({ length: 8 }, (_, i) => `<rect x="${i * 100}" y="${380 + (i % 2) * 6}" width="100" height="200" fill="${i % 2 ? "#16a34a" : "#22c55e"}" opacity=".35"/>`).join("");
  const badgeColor = { antes: "#b45309", depois: "#15803d", durante: "#c2410c", ref: "#1d4ed8", ocorrencia: "#b91c1c" }[variant];
  const badge = { antes: "ANTES", depois: "DEPOIS", durante: "DURANTE", ref: "REFERÊNCIA", ocorrencia: "OCORRÊNCIA" }[variant];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="${sky}"/>
<circle cx="700" cy="80" r="40" fill="#fde047"/>
<rect y="370" width="800" height="230" fill="${grass}"/>
${weeds}
${trees.join("")}
<rect x="0" y="530" width="800" height="70" fill="rgba(0,0,0,.55)"/>
<text x="24" y="574" font-family="Arial, sans-serif" font-size="28" fill="#fff" font-weight="bold">${label}</text>
<rect x="20" y="20" rx="10" width="${badge.length * 18 + 30}" height="44" fill="${badgeColor}"/>
<text x="35" y="51" font-family="Arial, sans-serif" font-size="24" fill="#fff" font-weight="bold">${badge}</text>
</svg>`;
}

let seedCounter = 1;
async function makeImage(label: string, variant: Variant): Promise<string> {
  const fileName = `seed-${randomBytes(5).toString("hex")}.svg`;
  await writeFile(path.join(UPLOAD_DIR, fileName), sceneSvg(label, variant, seedCounter++));
  return fileName;
}

const hash = (p: string) => bcrypt.hashSync(p, 10);
const token = () => randomBytes(8).toString("base64url");

async function main() {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const existing = await db.user.count();
  if (existing > 0) {
    console.log("Banco já possui dados. Use `npm run db:reset` para recriar.");
    return;
  }

  const now = new Date();
  const today = dateKey(now);
  const day = (offset: number, time = "08:00") => fromLocal(dateKey(addDays(now, offset)), time);

  // ---------------- Usuários e equipes ----------------
  const admin = await db.user.create({ data: { name: "Ana Souza", login: "admin", passwordHash: hash("admin123"), role: "ADMIN", email: "ana@empresa.com" } });
  const lider = await db.user.create({ data: { name: "Roberto Lima", login: "lider", passwordHash: hash("lider123"), role: "LIDER", email: "roberto@empresa.com" } });
  const joao = await db.user.create({ data: { name: "João Silva", login: "joao", passwordHash: hash("123456"), role: "JARDINEIRO", phone: "(11) 98888-0001" } });
  const carlos = await db.user.create({ data: { name: "Carlos Pereira", login: "carlos", passwordHash: hash("123456"), role: "JARDINEIRO", phone: "(11) 98888-0002" } });
  const maria = await db.user.create({ data: { name: "Maria Oliveira", login: "maria", passwordHash: hash("123456"), role: "JARDINEIRO", phone: "(11) 98888-0003" } });
  const pedro = await db.user.create({ data: { name: "Pedro Santos", login: "pedro", passwordHash: hash("123456"), role: "JARDINEIRO", phone: "(11) 98888-0004" } });

  const equipe = await db.team.create({
    data: { name: "Equipe de Jardinagem", description: "Poda, corte de grama e canteiros", color: "#16a34a", members: { create: [{ userId: joao.id }, { userId: carlos.id }, { userId: maria.id }] } },
  });
  const irrigacao = await db.team.create({
    data: { name: "Equipe de Irrigação", description: "Sistemas de irrigação e adubação", color: "#0284c7", members: { create: [{ userId: pedro.id }, { userId: maria.id }] } },
  });

  // ---------------- Checklists padrão ----------------
  const podaTemplate = await db.checklistTemplate.create({
    data: {
      name: "Poda padrão",
      type: "PODA",
      createdById: admin.id,
      items: {
        create: [
          { text: "Verificar a área antes do início", required: true, order: 0 },
          { text: "Utilizar os EPIs necessários", required: true, order: 1 },
          { text: "Realizar a poda", required: true, order: 2 },
          { text: "Retirar galhos e folhas", required: true, order: 3 },
          { text: "Limpar o local", required: true, order: 4 },
          { text: "Destinar corretamente os resíduos verdes", required: false, order: 5 },
          { text: "Conferir o resultado", required: true, order: 6 },
          { text: "Tirar foto após a conclusão", required: true, order: 7 },
        ],
      },
    },
    include: { items: true },
  });
  const gramaTemplate = await db.checklistTemplate.create({
    data: {
      name: "Corte de grama padrão",
      type: "CORTE_GRAMA",
      createdById: admin.id,
      items: {
        create: [
          { text: "Verificar a área e remover objetos", required: true, order: 0 },
          { text: "Utilizar os EPIs necessários", required: true, order: 1 },
          { text: "Cortar a grama na altura indicada", required: true, order: 2 },
          { text: "Fazer acabamento nas bordas", required: false, order: 3 },
          { text: "Recolher a grama cortada", required: true, order: 4 },
          { text: "Tirar foto após a conclusão", required: true, order: 5 },
        ],
      },
    },
    include: { items: true },
  });
  await db.checklistTemplate.create({
    data: {
      name: "Irrigação",
      type: "IRRIGACAO",
      createdById: admin.id,
      items: {
        create: [
          { text: "Verificar pressão e registros", required: true, order: 0 },
          { text: "Inspecionar aspersores e gotejadores", required: true, order: 1 },
          { text: "Irrigar pelo tempo indicado", required: true, order: 2 },
          { text: "Registrar vazamentos encontrados", required: false, order: 3 },
        ],
      },
    },
  });

  // ---------------- Áreas e locais ----------------
  const areasData = [
    { code: "POR", name: "Portaria", color: "#fde68a", mapX: 2, mapY: 38, mapW: 12, mapH: 24, description: "Entrada principal e guarita" },
    { code: "EXT", name: "Área externa", color: "#bbf7d0", mapX: 16, mapY: 4, mapW: 40, mapH: 30, description: "Estacionamentos e gramados externos" },
    { code: "ADM", name: "Área administrativa", color: "#bfdbfe", mapX: 16, mapY: 38, mapW: 22, mapH: 30, description: "Prédio administrativo e recepção" },
    { code: "CAN", name: "Canteiro principal", color: "#fbcfe8", mapX: 40, mapY: 38, mapW: 16, mapH: 30, description: "Canteiro central de flores e arbustos" },
    { code: "GAL", name: "Galpão", color: "#e7e5e4", mapX: 58, mapY: 4, mapW: 26, mapH: 64, description: "Galpão de produção e entorno" },
    { code: "FUN", name: "Fundos da fábrica", color: "#d9f99d", mapX: 86, mapY: 4, mapW: 12, mapH: 92, description: "Cerca viva, horta e área de compostagem" },
  ];
  const areas: Record<string, { id: string }> = {};
  for (const a of areasData) areas[a.code] = await db.area.create({ data: a });

  const baseLat = -23.5505;
  const baseLng = -46.6333;
  const locationsData = [
    { code: "POR-01", area: "POR", name: "Portaria · Jardim de entrada", mapX: 8, mapY: 50, freq: "SEMANAL", team: equipe.id },
    { code: "EXT-EA", area: "EXT", name: "Estacionamento · Bloco A", mapX: 24, mapY: 16, freq: "QUINZENAL", team: equipe.id, desc: "Estacionamento de visitantes com 12 árvores (ipês e sibipirunas) e canteiros laterais." },
    { code: "EXT-EB", area: "EXT", name: "Estacionamento · Bloco B", mapX: 40, mapY: 16, freq: "QUINZENAL", team: equipe.id },
    { code: "EXT-GR", area: "EXT", name: "Gramado externo", mapX: 50, mapY: 28, freq: "QUINZENAL", user: joao.id },
    { code: "ADM-RC", area: "ADM", name: "Jardim da recepção", mapX: 26, mapY: 52, freq: "SEMANAL", user: maria.id },
    { code: "CAN-CT", area: "CAN", name: "Canteiro principal · Centro", mapX: 48, mapY: 52, freq: "DIARIA", team: irrigacao.id },
    { code: "GAL-LT", area: "GAL", name: "Galpão · Lateral leste", mapX: 72, mapY: 36, freq: "MENSAL", user: carlos.id },
    { code: "FUN-CV", area: "FUN", name: "Fundos · Cerca viva", mapX: 92, mapY: 30, freq: "MENSAL", user: carlos.id },
    { code: "FUN-HT", area: "FUN", name: "Fundos · Horta e compostagem", mapX: 92, mapY: 72, freq: "SEMANAL", user: pedro.id },
  ];
  const loc: Record<string, { id: string; areaId: string; name: string }> = {};
  let li = 0;
  for (const l of locationsData) {
    const created = await db.location.create({
      data: {
        code: l.code,
        name: l.name,
        areaId: areas[l.area].id,
        description: l.desc ?? `Local de manutenção: ${l.name}.`,
        address: "Av. das Indústrias, 1000 · Fábrica",
        latitude: baseLat + li * 0.0004,
        longitude: baseLng + li * 0.0005,
        mapX: l.mapX,
        mapY: l.mapY,
        maintenanceFrequency: l.freq,
        responsibleTeamId: l.team ?? null,
        responsibleUserId: l.user ?? null,
        notes: li % 2 === 0 ? "Atenção à circulação de veículos e pedestres." : null,
        qrCode: { create: { token: token() } },
      },
    });
    loc[l.code] = created;
    const ref = await makeImage(l.name, "ref");
    await db.photo.create({ data: { fileName: ref, mimeType: "image/svg+xml", stage: "REFERENCIA", locationId: created.id, uploadedById: admin.id, caption: "Foto de referência" } });
    li++;
  }

  // ---------------- Tarefas ----------------
  let number = 1;
  type TaskSeed = {
    title: string;
    type: string;
    priority: string;
    status: string;
    loc: string;
    user?: string;
    team?: string;
    scheduledAt: Date;
    dueAt: Date;
    instructions?: string;
    description?: string;
    origin?: string;
    checklist?: { text: string; required: boolean }[];
    checklistDone?: boolean | number;
    execution?: { start: Date; end?: Date; by: string; notes?: string };
    approved?: { by: string; at: Date };
    returned?: string;
    cancelReason?: string;
    createdBy?: string;
  };

  const podaChecklist = podaTemplate.items.sort((a, b) => a.order - b.order).map((i) => ({ text: i.text, required: i.required }));
  const gramaChecklist = gramaTemplate.items.sort((a, b) => a.order - b.order).map((i) => ({ text: i.text, required: i.required }));
  const simpleChecklist = [
    { text: "Verificar a área antes do início", required: true },
    { text: "Utilizar os EPIs necessários", required: true },
    { text: "Executar o serviço", required: true },
    { text: "Limpar o local", required: false },
    { text: "Tirar foto após a conclusão", required: true },
  ];

  async function createTask(t: TaskSeed) {
    const l = loc[t.loc];
    const creator = t.createdBy ?? lider.id;
    const checklist = t.checklist ?? simpleChecklist;
    const minutes = t.execution?.end ? Math.round((t.execution.end.getTime() - t.execution.start.getTime()) / 60000) : 0;
    const task = await db.task.create({
      data: {
        number: number++,
        title: t.title,
        type: t.type,
        priority: t.priority,
        status: t.status,
        origin: t.origin ?? "MANUAL",
        description: t.description,
        instructions: t.instructions ?? "Seguir o checklist e registrar fotos do resultado.",
        locationId: l.id,
        areaId: l.areaId,
        assigneeUserId: t.user ?? null,
        assigneeTeamId: t.team ?? null,
        scheduledAt: t.scheduledAt,
        dueAt: t.dueAt,
        createdById: creator,
        startedAt: t.execution?.start,
        finishedAt: t.execution?.end,
        totalMinutes: minutes,
        executionNotes: t.execution?.notes,
        submittedAt: t.execution?.end,
        approvedAt: t.approved?.at,
        approvedById: t.approved?.by,
        returnCount: t.returned ? 1 : 0,
        lastReturnReason: t.returned,
        cancelReason: t.cancelReason,
        lateNotifiedAt: t.status === "ATRASADA" ? now : null,
        createdAt: addDays(t.scheduledAt, -2),
        checklist: {
          create: checklist.map((c, idx) => {
            const done = t.checklistDone === true || (typeof t.checklistDone === "number" && idx < t.checklistDone);
            return { text: c.text, required: c.required, order: idx, done, doneAt: done ? t.execution?.end ?? t.execution?.start : null, doneById: done ? t.execution?.by : null };
          }),
        },
      },
    });
    await db.auditLog.create({ data: { entityType: "TASK", entityId: task.id, action: "CRIADA", summary: "Tarefa criada", userId: creator, taskId: task.id, locationId: l.id, createdAt: addDays(t.scheduledAt, -2) } });

    const before = await makeImage(`${l.name}`, "antes");
    await db.photo.create({ data: { fileName: before, mimeType: "image/svg+xml", stage: "ANTES", taskId: task.id, locationId: l.id, uploadedById: creator, takenAt: addDays(t.scheduledAt, -2), createdAt: addDays(t.scheduledAt, -2) } });

    if (t.execution) {
      await db.timeLog.create({ data: { taskId: task.id, userId: t.execution.by, startedAt: t.execution.start, endedAt: t.execution.end ?? null, minutes } });
      await db.auditLog.create({ data: { entityType: "TASK", entityId: task.id, action: "INICIADA", summary: "Execução iniciada", userId: t.execution.by, taskId: task.id, locationId: l.id, createdAt: t.execution.start } });
      if (t.execution.end) {
        const during = await makeImage(`${l.name}`, "durante");
        const after = await makeImage(`${l.name}`, "depois");
        const mid = new Date((t.execution.start.getTime() + t.execution.end.getTime()) / 2);
        await db.photo.create({ data: { fileName: during, mimeType: "image/svg+xml", stage: "DURANTE", taskId: task.id, locationId: l.id, uploadedById: t.execution.by, takenAt: mid, createdAt: mid } });
        await db.photo.create({ data: { fileName: after, mimeType: "image/svg+xml", stage: "DEPOIS", taskId: task.id, locationId: l.id, uploadedById: t.execution.by, takenAt: t.execution.end, createdAt: t.execution.end } });
        await db.auditLog.create({ data: { entityType: "TASK", entityId: task.id, action: "ENVIADA_APROVACAO", summary: "Execução finalizada e enviada para aprovação", userId: t.execution.by, taskId: task.id, locationId: l.id, createdAt: t.execution.end } });
      }
    }
    if (t.approved) {
      await db.approval.create({ data: { taskId: task.id, reviewerId: t.approved.by, decision: "APROVADA", comment: "Serviço conferido, tudo certo.", createdAt: t.approved.at } });
      await db.auditLog.create({ data: { entityType: "TASK", entityId: task.id, action: "APROVADA", summary: "Tarefa aprovada e concluída", userId: t.approved.by, taskId: task.id, locationId: l.id, createdAt: t.approved.at } });
    }
    if (t.returned) {
      await db.approval.create({ data: { taskId: task.id, reviewerId: lider.id, decision: "DEVOLVIDA", comment: t.returned, createdAt: addDays(now, -1) } });
      await db.auditLog.create({ data: { entityType: "TASK", entityId: task.id, action: "DEVOLVIDA", summary: `Devolvida para correção: ${t.returned}`, userId: lider.id, taskId: task.id, locationId: l.id, createdAt: addDays(now, -1) } });
    }
    return task;
  }

  // Histórico do Estacionamento · Bloco A
  await createTask({
    title: "Poda das árvores do estacionamento",
    type: "PODA", priority: "ALTA", status: "CONCLUIDA", loc: "EXT-EA", user: joao.id,
    scheduledAt: day(-13, "08:00"), dueAt: day(-13, "17:00"), checklist: podaChecklist, checklistDone: true,
    execution: { start: day(-13, "08:15"), end: day(-13, "09:40"), by: joao.id, notes: "Poda realizada em 6 árvores. Resíduos levados para a compostagem." },
    approved: { by: lider.id, at: day(-13, "11:00") },
  });
  await createTask({
    title: "Limpeza dos canteiros do estacionamento",
    type: "LIMPEZA", priority: "MEDIA", status: "CONCLUIDA", loc: "EXT-EA", user: carlos.id,
    scheduledAt: day(-2, "07:30"), dueAt: day(-2, "12:00"), checklistDone: true,
    execution: { start: day(-2, "07:40"), end: day(-2, "08:35"), by: carlos.id, notes: "Folhas recolhidas e canteiros varridos." },
    approved: { by: admin.id, at: day(-2, "10:00") },
  });
  await createTask({
    title: "Poda de manutenção · Estacionamento A",
    type: "PODA", priority: "MEDIA", status: "PROGRAMADA", loc: "EXT-EA", user: joao.id,
    scheduledAt: day(17, "08:00"), dueAt: day(17, "17:00"), checklist: podaChecklist,
  });

  // Hoje
  await createTask({
    title: "Poda das árvores do estacionamento",
    type: "PODA", priority: "ALTA", status: "PENDENTE", loc: "EXT-EA", team: equipe.id, origin: "RONDA",
    description: "Galhos avançando sobre a área de circulação.",
    instructions: "Realizar a poda mantendo a copa da árvore equilibrada. Isolar a área com cones antes de começar.",
    scheduledAt: fromLocal(today, "08:00"), dueAt: fromLocal(dateKey(addDays(now, 2)), "17:00"), checklist: podaChecklist,
  });
  await createTask({
    title: "Corte de grama do gramado externo",
    type: "CORTE_GRAMA", priority: "MEDIA", status: "PENDENTE", loc: "EXT-GR", user: joao.id,
    instructions: "Altura de corte: 5 cm. Recolher toda a grama cortada.",
    scheduledAt: fromLocal(today, "09:00"), dueAt: fromLocal(dateKey(addDays(now, 1)), "18:00"), checklist: gramaChecklist,
  });
  await createTask({
    title: "Irrigação do canteiro principal",
    type: "IRRIGACAO", priority: "URGENTE", status: "EM_ANDAMENTO", loc: "CAN-CT", user: pedro.id,
    instructions: "Irrigar por 20 minutos. Verificar gotejadores entupidos.",
    scheduledAt: fromLocal(today, "07:00"), dueAt: fromLocal(dateKey(addDays(now, 1)), "12:00"), checklistDone: 2,
    execution: { start: new Date(now.getTime() - 50 * 60000), by: pedro.id },
  });
  await createTask({
    title: "Capina da cerca viva dos fundos",
    type: "CAPINA", priority: "MEDIA", status: "AGUARDANDO_APROVACAO", loc: "FUN-CV", user: maria.id,
    scheduledAt: day(-1, "13:00"), dueAt: day(1, "17:00"), checklistDone: true,
    execution: { start: day(-1, "13:10"), end: day(-1, "15:05"), by: maria.id, notes: "Capina completa. Encontrado um formigueiro próximo ao portão." },
  });
  await createTask({
    title: "Adubação do canteiro principal",
    type: "ADUBACAO", priority: "ALTA", status: "ATRASADA", loc: "CAN-CT", user: carlos.id,
    scheduledAt: day(-3, "08:00"), dueAt: day(-1, "17:00"),
  });
  await createTask({
    title: "Plantio de mudas no jardim da recepção",
    type: "PLANTIO", priority: "MEDIA", status: "PENDENTE", loc: "ADM-RC", user: maria.id,
    instructions: "Plantar 20 mudas de lavanda nos vasos da entrada.",
    scheduledAt: day(0, "14:00"), dueAt: day(3, "17:00"), checklistDone: false,
    returned: "As mudas do lado esquerdo ficaram tortas. Refazer o alinhamento e enviar nova foto.",
    execution: { start: day(-1, "09:00"), end: day(-1, "10:10"), by: maria.id },
  });
  await createTask({
    title: "Controle de pragas no galpão",
    type: "CONTROLE_PRAGAS", priority: "ALTA", status: "PROGRAMADA", loc: "GAL-LT", team: equipe.id, origin: "OCORRENCIA",
    description: "Formigas cortadeiras nas plantas da lateral do galpão.",
    scheduledAt: day(2, "08:00"), dueAt: day(4, "17:00"),
  });
  await createTask({
    title: "Retirada de resíduos verdes · Horta",
    type: "RESIDUOS_VERDES", priority: "BAIXA", status: "PROGRAMADA", loc: "FUN-HT", user: pedro.id,
    scheduledAt: day(4, "10:00"), dueAt: day(5, "17:00"),
  });
  await createTask({
    title: "Manutenção dos canteiros da portaria",
    type: "CANTEIROS", priority: "MEDIA", status: "PROGRAMADA", loc: "POR-01", user: carlos.id,
    scheduledAt: day(1, "08:00"), dueAt: day(1, "17:00"),
  });
  await createTask({
    title: "Limpeza do estacionamento B",
    type: "LIMPEZA", priority: "BAIXA", status: "CANCELADA", loc: "EXT-EB", user: joao.id,
    scheduledAt: day(-4, "08:00"), dueAt: day(-4, "17:00"), cancelReason: "Estacionamento interditado para obras.",
  });
  await createTask({
    title: "Poda da cerca viva",
    type: "PODA", priority: "MEDIA", status: "CONCLUIDA", loc: "FUN-CV", user: carlos.id,
    scheduledAt: day(-8, "08:00"), dueAt: day(-8, "17:00"), checklist: podaChecklist, checklistDone: true,
    execution: { start: day(-8, "08:05"), end: day(-8, "10:20"), by: carlos.id },
    approved: { by: lider.id, at: day(-8, "14:00") },
  });
  await createTask({
    title: "Corte de grama da portaria",
    type: "CORTE_GRAMA", priority: "BAIXA", status: "CONCLUIDA", loc: "POR-01", user: joao.id,
    scheduledAt: day(-5, "08:00"), dueAt: day(-5, "17:00"), checklist: gramaChecklist, checklistDone: true,
    execution: { start: day(-5, "08:00"), end: day(-5, "08:50"), by: joao.id },
    approved: { by: lider.id, at: day(-5, "09:30") },
  });

  // ---------------- Ocorrências ----------------
  const occ1Photo = await makeImage("Canteiro principal · vazamento", "ocorrencia");
  const occ1 = await db.occurrence.create({
    data: { number: 1, type: "VAZAMENTO_IRRIGACAO", description: "Vazamento no registro do gotejamento, formando poça no canteiro.", priority: "ALTA", locationId: loc["CAN-CT"].id, reportedById: pedro.id, responsibleUserId: pedro.id, createdAt: new Date(now.getTime() - 3 * 3600000) },
  });
  await db.photo.create({ data: { fileName: occ1Photo, mimeType: "image/svg+xml", stage: "OCORRENCIA", occurrenceId: occ1.id, locationId: loc["CAN-CT"].id, uploadedById: pedro.id } });

  const occ2Photo = await makeImage("Estacionamento B · árvore", "ocorrencia");
  const occ2 = await db.occurrence.create({
    data: { number: 2, type: "ARVORE_DANIFICADA", description: "Galho grande quebrado após a chuva, apoiado sobre a cerca.", priority: "URGENTE", locationId: loc["EXT-EB"].id, reportedById: lider.id, createdAt: new Date(now.getTime() - 26 * 3600000) },
  });
  await db.photo.create({ data: { fileName: occ2Photo, mimeType: "image/svg+xml", stage: "OCORRENCIA", occurrenceId: occ2.id, locationId: loc["EXT-EB"].id, uploadedById: lider.id } });

  const pragaTask = await db.task.findFirst({ where: { title: "Controle de pragas no galpão" } });
  await db.occurrence.create({
    data: { number: 3, type: "PRAGA", description: "Formigas cortadeiras atacando as plantas da lateral do galpão.", priority: "ALTA", status: "CONVERTIDA", locationId: loc["GAL-LT"].id, reportedById: carlos.id, convertedTaskId: pragaTask?.id, createdAt: day(-2, "15:00") },
  });

  // ---------------- Cronograma e recorrências ----------------
  const schedule = await db.schedule.create({
    data: { name: "Cronograma de manutenção 2026", description: "Plano anual de manutenção das áreas verdes", startDate: fromLocal(`${today.slice(0, 4)}-01-01`), createdById: admin.id },
  });
  await db.recurringMaintenance.create({
    data: {
      title: "Corte de grama · Gramado externo",
      type: "CORTE_GRAMA", priority: "MEDIA", frequency: "QUINZENAL",
      locationId: loc["EXT-GR"].id, areaId: loc["EXT-GR"].areaId, assigneeTeamId: equipe.id, scheduleId: schedule.id,
      checklistTemplateId: gramaTemplate.id, checklistJson: JSON.stringify(gramaChecklist),
      startDate: day(3), timeOfDay: "08:00", durationHours: 9, createdById: admin.id,
      instructions: "Corte a cada 15 dias. Altura de 5 cm.",
    },
  });
  await db.recurringMaintenance.create({
    data: {
      title: "Irrigação semanal · Jardim da recepção",
      type: "IRRIGACAO", priority: "BAIXA", frequency: "SEMANAL",
      locationId: loc["ADM-RC"].id, areaId: loc["ADM-RC"].areaId, assigneeUserId: pedro.id, scheduleId: schedule.id,
      checklistJson: JSON.stringify([{ text: "Irrigar vasos e canteiros", required: true }, { text: "Verificar vazamentos", required: false }]),
      startDate: day(1), timeOfDay: "07:00", durationHours: 4, createdById: lider.id,
    },
  });
  await generateAllRecurrences();

  // ---------------- Notificações iniciais ----------------
  await db.notification.createMany({
    data: [
      { userId: joao.id, type: "NOVA_TAREFA", title: "Nova tarefa atribuída", message: "Corte de grama do gramado externo · hoje", link: "/minhas-tarefas" },
      { userId: carlos.id, type: "ATRASADA", title: "Tarefa atrasada", message: "Adubação do canteiro principal", link: "/minhas-tarefas" },
      { userId: maria.id, type: "DEVOLVIDA", title: "Tarefa devolvida para correção", message: "Plantio de mudas no jardim da recepção", link: "/minhas-tarefas" },
      { userId: lider.id, type: "AGUARDANDO_APROVACAO", title: "Serviço aguardando aprovação", message: "Capina da cerca viva dos fundos · Maria Oliveira", link: "/aprovacoes" },
      { userId: admin.id, type: "AGUARDANDO_APROVACAO", title: "Serviço aguardando aprovação", message: "Capina da cerca viva dos fundos · Maria Oliveira", link: "/aprovacoes" },
      { userId: lider.id, type: "NOVA_OCORRENCIA", title: "Nova ocorrência", message: "Vazamento na irrigação · Canteiro principal · Centro", link: "/ocorrencias" },
      { userId: admin.id, type: "NOVA_OCORRENCIA", title: "Nova ocorrência", message: "Vazamento na irrigação · Canteiro principal · Centro", link: "/ocorrencias" },
    ],
  });

  console.log("Dados de demonstração criados.");
  console.log("  Liderança: admin / admin123  ·  lider / lider123");
  console.log("  Jardineiros: joao, carlos, maria, pedro / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
