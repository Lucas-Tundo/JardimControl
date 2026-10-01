// A operação acontece no fuso de Brasília (sem horário de verão desde 2019).
export const TIMEZONE = "America/Sao_Paulo";
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Data "de parede" em São Paulo, lida via getUTC*. */
function wall(d: Date): Date {
  return new Date(d.getTime() - OFFSET_MS);
}

/** "YYYY-MM-DD" no fuso de São Paulo. */
export function dateKey(d: Date): string {
  return wall(d).toISOString().slice(0, 10);
}

/** "HH:mm" no fuso de São Paulo. */
export function timeKey(d: Date): string {
  return wall(d).toISOString().slice(11, 16);
}

/** Converte data "YYYY-MM-DD" + hora "HH:mm" (horário de São Paulo) em Date. */
export function fromLocal(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time.length === 5 ? time : "00:00"}:00-03:00`);
}

export function startOfDay(d: Date): Date {
  return fromLocal(dateKey(d), "00:00");
}

export function endOfDay(d: Date): Date {
  return new Date(startOfDay(d).getTime() + DAY_MS - 1);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function addMonths(d: Date, n: number): Date {
  const w = wall(d);
  const day = w.getUTCDate();
  const target = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + n, 1, w.getUTCHours(), w.getUTCMinutes()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return new Date(target.getTime() + OFFSET_MS);
}

/** Segunda-feira 00:00 da semana de `d`. */
export function startOfWeek(d: Date): Date {
  const dow = wall(d).getUTCDay(); // 0 = domingo
  const diff = dow === 0 ? -6 : 1 - dow;
  return startOfDay(addDays(d, diff));
}

export function startOfMonth(d: Date): Date {
  return fromLocal(dateKey(d).slice(0, 8) + "01");
}

export function endOfMonth(d: Date): Date {
  return new Date(addMonths(startOfMonth(d), 1).getTime() - 1);
}

export function weekday(d: Date): number {
  return wall(d).getUTCDay();
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, ...opts });
const fDate = fmt({ day: "2-digit", month: "2-digit", year: "numeric" });
const fShort = fmt({ day: "2-digit", month: "2-digit" });
const fTime = fmt({ hour: "2-digit", minute: "2-digit" });
const fWeekday = fmt({ weekday: "long" });
const fWeekdayShort = fmt({ weekday: "short" });
const fMonth = fmt({ month: "long", year: "numeric" });

export const formatDate = (d?: Date | null) => (d ? fDate.format(d) : "-");
export const formatShortDate = (d?: Date | null) => (d ? fShort.format(d) : "-");
export const formatTime = (d?: Date | null) => (d ? fTime.format(d) : "-");
export const formatDateTime = (d?: Date | null) => (d ? `${fDate.format(d)} ${fTime.format(d)}` : "-");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const formatWeekday = (d: Date) => cap(fWeekday.format(d));
export const formatWeekdayShort = (d: Date) => fWeekdayShort.format(d).replace(".", "");
export const formatMonth = (d: Date) => cap(fMonth.format(d));

/** 85 vira "1h25"; 40 vira "40min". */
export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/** Texto relativo amigável: "Hoje", "Amanhã", "Ontem" ou a data. */
export function relativeDay(d: Date, now = new Date()): string {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return formatDate(d);
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}
