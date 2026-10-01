// Falha se o código de interface tiver travessão, emoji ou fonte menor que 12px.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOTS = ["src", "prisma"];
const EXTS = new Set([".ts", ".tsx", ".css", ".prisma"]);

const RULES = [
  { name: "travessão", re: /[\u2013\u2014]/ },
  { name: "emoji", re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u },
  { name: "fonte menor que 12px (classe)", re: /text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/ },
  { name: "fonte menor que 12px (CSS)", re: /font-size:\s*(?:[0-9]|1[01])(?:\.\d+)?px/ },
  { name: "caixa alta automática", re: /\buppercase\b/ },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of ROOTS.flatMap((r) => walk(r))) {
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.re.test(line)) problems.push(`${relative(".", file)}:${i + 1}  ${rule.name}  ${line.trim().slice(0, 100)}`);
      }
    });
}

if (problems.length) {
  console.error(`audit:ui encontrou ${problems.length} problema(s):\n` + problems.join("\n"));
  process.exit(1);
}
console.log("audit:ui sem problemas.");
