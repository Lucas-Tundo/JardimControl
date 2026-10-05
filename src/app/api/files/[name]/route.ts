import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FILE_NAME_RE } from "@/lib/files";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!(await getCurrentUser())) return new Response("Não autorizado", { status: 401 });
  if (!FILE_NAME_RE.test(name)) return new Response("Arquivo inválido", { status: 400 });
  const file = await db.storedFile.findUnique({ where: { name } });
  if (!file) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(file.mimeType === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}
