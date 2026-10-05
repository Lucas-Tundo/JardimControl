import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Verificação de saúde: confirma que o app responde e alcança o banco. */
export async function GET() {
  try {
    await db.user.count();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[health]", err);
    return Response.json({ ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) }, { status: 500 });
  }
}
