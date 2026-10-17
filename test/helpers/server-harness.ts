import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// Startet dist/index.js als echten MCP-Server ueber stdio. Ein Ersatz fuer
// `open` liegt vorn im PATH und schreibt jede URL in eine Datei, statt Things
// zu oeffnen. So laesst sich pruefen, was der Server wirklich an `open` gibt,
// ohne Things anzufassen.

export const distEntry = path.resolve(__dirname, "../../dist/index.js");

export interface Harness {
  client: Client;
  openedUrls: () => string[];
  close: () => Promise<void>;
}

export async function startServer(extraEnv: Record<string, string> = {}): Promise<Harness> {
  if (!existsSync(distEntry)) {
    throw new Error(`${distEntry} fehlt, erst pnpm build`);
  }

  const dir = mkdtempSync(path.join(tmpdir(), "things-mcp-test-"));
  const log = path.join(dir, "open.log");
  writeFileSync(log, "");
  const stub = path.join(dir, "open");
  writeFileSync(stub, `#!/bin/sh\nprintf '%s\\n' "$1" >> "${log}"\n`);
  chmodSync(stub, 0o755);

  const env: Record<string, string> = {
    PATH: `${dir}:/usr/bin:/bin`,
    HOME: process.env.HOME ?? dir,
    ...extraEnv,
  };

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [distEntry],
    env,
    stderr: "pipe",
  });
  const client = new Client({ name: "things-mcp-test", version: "0.0.0" });
  await client.connect(transport);

  return {
    client,
    openedUrls: () => readFileSync(log, "utf8").split("\n").filter(Boolean),
    close: () => client.close(),
  };
}

// Text aller Inhaltsteile einer Werkzeug-Antwort, auch bei isError.
export function resultText(result: unknown): string {
  const content = (result as { content?: unknown[] }).content ?? [];
  return content
    .map((part) => {
      const p = part as { text?: string; resource?: { text?: string } };
      return p.text ?? p.resource?.text ?? "";
    })
    .join("\n");
}
