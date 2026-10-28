import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { loadInstructions } from "../src/instructions.js";
import { startServer, type Harness } from "./helpers/server-harness.js";

function tempFile(content: string): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "things-mcp-instr-")), "regeln.md");
  writeFileSync(file, content);
  return file;
}

describe("loadInstructions", () => {
  it("ohne Variable: keine Instructions", () => {
    expect(loadInstructions({})).toBeUndefined();
  });

  it("liest die Datei und schneidet Leerraum ab", () => {
    expect(loadInstructions({ THINGS_MCP_INSTRUCTIONS: tempFile("\nRegel A\n\n") })).toBe(
      "Regel A"
    );
  });

  it("leere Datei: keine Instructions", () => {
    expect(loadInstructions({ THINGS_MCP_INSTRUCTIONS: tempFile("  \n") })).toBeUndefined();
  });

  it("fehlende Datei: keine Instructions, kein Absturz", () => {
    expect(loadInstructions({ THINGS_MCP_INSTRUCTIONS: "/gibt/es/nicht.md" })).toBeUndefined();
  });
});

describe("Instructions ueber stdio", () => {
  let h: Harness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("liefert den Dateiinhalt beim Verbinden", async () => {
    h = await startServer({ THINGS_MCP_INSTRUCTIONS: tempFile("Jedes Todo bekommt ein Projekt.") });
    expect(h.client.getInstructions()).toBe("Jedes Todo bekommt ein Projekt.");
  });

  it("ohne Datei startet der Server trotzdem", async () => {
    h = await startServer({ THINGS_MCP_INSTRUCTIONS: "/gibt/es/nicht.md" });
    expect(h.client.getInstructions()).toBeUndefined();
    expect(h.stderr()).toContain("THINGS_MCP_INSTRUCTIONS not readable (ENOENT)");
  });
});
