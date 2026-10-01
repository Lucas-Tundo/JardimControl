export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v.length ? v : null;
}

export function num(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function oneOf<T extends string>(value: string, allowed: Record<T, unknown>, fallback?: NoInfer<T>): T | null {
  if (value in allowed) return value as T;
  return fallback ?? null;
}

/** "user:ID" | "team:ID" para ids separados. */
export function parseAssignee(value: string): { assigneeUserId: string | null; assigneeTeamId: string | null } {
  if (value.startsWith("user:")) return { assigneeUserId: value.slice(5), assigneeTeamId: null };
  if (value.startsWith("team:")) return { assigneeUserId: null, assigneeTeamId: value.slice(5) };
  return { assigneeUserId: null, assigneeTeamId: null };
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro inesperado.";
}
