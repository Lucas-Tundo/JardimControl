import { headers } from "next/headers";

/** URL base usada nos QR Codes: APP_URL ou a origem da requisição atual. */
export async function getOrigin(): Promise<string> {
  const fixed = process.env.APP_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || /^\d/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
