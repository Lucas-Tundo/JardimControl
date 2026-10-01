import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const FILE_NAME_RE = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|svg)$/;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const MAX_BYTES = 15 * 1024 * 1024;

export type SavedFile = { fileName: string; mimeType: string };

export async function saveImage(file: File): Promise<SavedFile> {
  const ext = EXT_BY_MIME[file.type];
  if (!ext) throw new Error("Formato de imagem não suportado. Use JPG, PNG ou WEBP.");
  if (file.size > MAX_BYTES) throw new Error("Imagem muito grande (máx. 15 MB).");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(await file.arrayBuffer()));
  return { fileName, mimeType: file.type };
}

export async function saveImages(files: File[]): Promise<SavedFile[]> {
  const saved: SavedFile[] = [];
  for (const f of files) saved.push(await saveImage(f));
  return saved;
}

/** Extrai arquivos de imagem válidos de um campo do FormData. */
export function imagesFrom(form: FormData, field: string): File[] {
  return form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
}

export function photoUrl(fileName: string): string {
  return `/api/files/${fileName}`;
}
