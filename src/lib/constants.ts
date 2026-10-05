export const ROLES = {
  ADMIN: "Administrador",
  LIDER: "Liderança",
  JARDINEIRO: "Jardineiro",
} as const;
export type Role = keyof typeof ROLES;

export const TASK_STATUS = {
  PROGRAMADA: { label: "Programada", badge: "bg-blue-50 text-blue-800", dot: "bg-blue-500", hex: "#3b82f6" },
  PENDENTE: { label: "Pendente", badge: "bg-amber-50 text-amber-800", dot: "bg-amber-400", hex: "#f5b400" },
  EM_ANDAMENTO: { label: "Em andamento", badge: "bg-orange-50 text-orange-800", dot: "bg-orange-500", hex: "#f97316" },
  AGUARDANDO_APROVACAO: { label: "Aguardando aprovação", badge: "bg-cyan-50 text-cyan-800", dot: "bg-cyan-600", hex: "#0891b2" },
  CONCLUIDA: { label: "Concluída", badge: "bg-green-50 text-green-800", dot: "bg-green-600", hex: "#16a34a" },
  ATRASADA: { label: "Atrasada", badge: "bg-red-50 text-red-700", dot: "bg-red-600", hex: "#dc2626" },
  CANCELADA: { label: "Cancelada", badge: "bg-stone-100 text-stone-600", dot: "bg-stone-500", hex: "#6e6e73" },
} as const;
export type TaskStatus = keyof typeof TASK_STATUS;

/** Status em que a tarefa ainda não foi iniciada. */
export const NOT_STARTED: TaskStatus[] = ["PROGRAMADA", "PENDENTE", "ATRASADA"];
/** Status considerados "abertos" (trabalho ainda a fazer). */
export const OPEN_STATUSES: TaskStatus[] = ["PROGRAMADA", "PENDENTE", "ATRASADA", "EM_ANDAMENTO", "AGUARDANDO_APROVACAO"];

export const PRIORITIES = {
  BAIXA: { label: "Baixa", badge: "bg-stone-100 text-stone-600", bar: "bg-stone-300", weight: 1 },
  MEDIA: { label: "Média", badge: "bg-sky-50 text-sky-800", bar: "bg-sky-400", weight: 2 },
  ALTA: { label: "Alta", badge: "bg-orange-50 text-orange-800", bar: "bg-orange-500", weight: 3 },
  URGENTE: { label: "Urgente", badge: "bg-red-600 text-white", bar: "bg-red-600", weight: 4 },
} as const;
export type Priority = keyof typeof PRIORITIES;

export const MAINTENANCE_TYPES = {
  CORTE_GRAMA: { label: "Corte de grama" },
  PODA: { label: "Poda" },
  CAPINA: { label: "Capina" },
  IRRIGACAO: { label: "Irrigação" },
  PLANTIO: { label: "Plantio" },
  ADUBACAO: { label: "Adubação" },
  LIMPEZA: { label: "Limpeza" },
  CONTROLE_PRAGAS: { label: "Controle de pragas" },
  CANTEIROS: { label: "Manutenção de canteiros" },
  RESIDUOS_VERDES: { label: "Retirada de resíduos verdes" },
  OUTROS: { label: "Outros" },
} as const;
export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;

export const PERIODICITIES = {
  UNICA: "Única",
  DIARIA: "Diária",
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
  PERSONALIZADA: "Personalizada",
} as const;
export type Periodicity = keyof typeof PERIODICITIES;

export const TASK_ORIGINS = {
  MANUAL: "Cadastro",
  RONDA: "Ronda de Jardinagem",
  QRCODE: "QR Code do local",
  OCORRENCIA: "Ocorrência",
  RECORRENTE: "Manutenção recorrente",
} as const;
export type TaskOrigin = keyof typeof TASK_ORIGINS;

export const PHOTO_STAGES = {
  REFERENCIA: "Referência do local",
  ANTES: "Antes",
  DURANTE: "Durante",
  DEPOIS: "Depois",
  OCORRENCIA: "Ocorrência",
} as const;
export type PhotoStage = keyof typeof PHOTO_STAGES;

export const OCCURRENCE_TYPES = {
  ARVORE_DANIFICADA: { label: "Árvore danificada" },
  VAZAMENTO_IRRIGACAO: { label: "Vazamento na irrigação" },
  PRAGA: { label: "Praga" },
  EQUIPAMENTO_DANIFICADO: { label: "Equipamento danificado" },
  AREA_INACESSIVEL: { label: "Área inacessível" },
  MANUTENCAO_ADICIONAL: { label: "Manutenção adicional" },
  OUTRO: { label: "Outro" },
} as const;
export type OccurrenceType = keyof typeof OCCURRENCE_TYPES;

export const OCCURRENCE_STATUS = {
  ABERTA: { label: "Aberta", badge: "bg-red-50 text-red-700" },
  CONVERTIDA: { label: "Convertida em tarefa", badge: "bg-blue-50 text-blue-800" },
  RESOLVIDA: { label: "Resolvida", badge: "bg-green-50 text-green-800" },
} as const;
export type OccurrenceStatus = keyof typeof OCCURRENCE_STATUS;

export const NOTIFICATION_TYPES = {
  NOVA_TAREFA: { label: "Nova tarefa" },
  PRAZO_PROXIMO: { label: "Prazo próximo" },
  ATRASADA: { label: "Tarefa atrasada" },
  CONCLUIDA: { label: "Tarefa concluída" },
  DEVOLVIDA: { label: "Tarefa devolvida" },
  AGUARDANDO_APROVACAO: { label: "Aguardando aprovação" },
  NOVA_OCORRENCIA: { label: "Nova ocorrência" },
  MANUTENCAO_PROGRAMADA: { label: "Manutenção programada" },
  INSTRUCOES: { label: "Instruções e fotos" },
} as const;
export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export function labelOf<T extends Record<string, unknown>>(map: T, key: string | null | undefined): string {
  if (!key) return "Não informado";
  const v = map[key as keyof T];
  if (v === undefined) return key;
  if (typeof v === "string") return v;
  return (v as { label: string }).label;
}

export const DEFAULT_CHECKLIST = [
  { text: "Verificar a área antes do início", required: true },
  { text: "Utilizar os EPIs necessários", required: true },
  { text: "Executar o serviço", required: true },
  { text: "Retirar galhos, folhas e resíduos", required: false },
  { text: "Limpar o local", required: true },
  { text: "Destinar corretamente os resíduos verdes", required: false },
  { text: "Conferir o resultado", required: true },
  { text: "Tirar foto após a conclusão", required: true },
];
