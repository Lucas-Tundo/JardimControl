// Guardrails do design system (DESIGN-SYSTEM.md e UX-AUDIT.md). Falha nos erros; só avisa nos alertas.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const ROOTS = ["src", "prisma", "scripts"];
const EXTS = new Set([".ts", ".tsx", ".css", ".prisma", ".mjs"]);
const MODAL_FILE = ["src", "components", "dialog.tsx"].join(sep);
const SELF = ["scripts", "audit-ui.mjs"].join(sep);

const RULES = [
  { name: "travessão", re: /[\u2013\u2014]/ },
  { name: "emoji", re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u },
  { name: "fonte menor que 12px (classe)", re: /text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/ },
  { name: "fonte menor que 12px (CSS)", re: /font-size:\s*(?:[0-9]|1[01])(?:\.\d+)?px/ },
  { name: "caixa alta automática", re: /\buppercase\b/ },
  { name: "tema roxo genérico (fora da paleta)", re: /\b(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:violet|purple|indigo|fuchsia)-\d{2,3}\b/ },
  { name: "confirm() do navegador (use useConfirm)", re: /(?:window\.|[^\w.])confirm\(\s*["'`]/ },
  { name: "camada escrita à mão fora de dialog.tsx", re: /role="(?:dialog|alertdialog)"|aria-modal|\bfixed inset-0\b/, skip: (file) => file === MODAL_FILE },
];

const WARNINGS = [{ name: "vocabulário de processo em texto visível", re: />[^<{]*\b(?:importado|sincronizado|migrado|legado)\b/i }];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const problems = [];
const warnings = [];
for (const file of ROOTS.flatMap((r) => walk(r))) {
  const rel = relative(".", file);
  if (rel === SELF) continue;
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, i) => {
      const where = `${rel}:${i + 1}`;
      for (const rule of RULES) {
        if (rule.skip?.(rel)) continue;
        if (rule.re.test(line)) problems.push(`${where}  ${rule.name}  ${line.trim().slice(0, 100)}`);
      }
      for (const rule of WARNINGS) {
        if (rule.re.test(line)) warnings.push(`${where}  ${rule.name}  ${line.trim().slice(0, 100)}`);
      }
    });
}

if (warnings.length) console.warn(`audit:ui avisos (${warnings.length}):\n` + warnings.join("\n"));
if (problems.length) {
  console.error(`audit:ui encontrou ${problems.length} problema(s):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("audit:ui sem problemas.");
