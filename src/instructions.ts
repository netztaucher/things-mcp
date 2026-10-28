// Server-Instructions aus einer Datei. Der Pfad kommt aus
// THINGS_MCP_INSTRUCTIONS. So bleiben persoenliche Sortierregeln (Projekte,
// Tags, Kundennamen) ausserhalb dieses oeffentlichen Repos. Fehlt die Datei,
// laeuft der Server ohne Instructions weiter und meldet das auf stderr.

import { readFileSync } from "fs";

export function loadInstructions(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const file = env.THINGS_MCP_INSTRUCTIONS;
  if (!file) return undefined;
  try {
    const text = readFileSync(file, "utf8").trim();
    return text || undefined;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "unknown";
    console.error(`WARN: THINGS_MCP_INSTRUCTIONS not readable (${code}): ${file}`);
    return undefined;
  }
}
