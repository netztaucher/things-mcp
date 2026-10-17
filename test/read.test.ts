import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { readTodos, ThingsReadError, type ReadRunner } from "../src/read.js";
import { startServer, resultText, type Harness } from "./helpers/server-harness.js";

const readScript = path.resolve(__dirname, "../scripts/things-read.jxa");

// Ersatz fuer osascript: schreibt jedes Argument in eine eigene Zeile der
// Datei args.json (als JSON-Array) und gibt den Inhalt von reply aus.
function fakeRunner(reply: string): { runner: ReadRunner; args: () => string[] } {
  const dir = mkdtempSync(path.join(tmpdir(), "things-read-test-"));
  const replyFile = path.join(dir, "reply");
  const argsFile = path.join(dir, "args.json");
  writeFileSync(replyFile, reply);
  const bin = path.join(dir, "fake-osascript");
  writeFileSync(
    bin,
    `#!/usr/bin/env node\nrequire("fs").writeFileSync(${JSON.stringify(argsFile)}, JSON.stringify(process.argv.slice(2)));\nprocess.stdout.write(require("fs").readFileSync(${JSON.stringify(replyFile)}, "utf8"));\n`
  );
  chmodSync(bin, 0o755);
  return {
    runner: { binary: bin, script: "/pfad/things-read.jxa", timeoutMs: 10_000 },
    args: () => JSON.parse(readFileSync(argsFile, "utf8")),
  };
}

const todo = {
  id: "T1",
  name: "Probe",
  notes: "",
  status: "open",
  activation_date: "2026-11-01",
  due_date: null,
  tags: ["skill"],
  project: { id: "P1", name: "Projekt" },
  area: null,
};

describe("readTodos", () => {
  it("gibt die Anfrage als ein JSON-Argument weiter, ohne Shell", async () => {
    const { runner, args } = fakeRunner(
      JSON.stringify({ source: "search", total: 1, returned: 1, truncated: false, todos: [todo] })
    );
    const query = `$(touch /tmp/nie) ' " ; a b`;
    const result = await readTodos({ source: "search", query, limit: 5 }, runner);
    expect(result.todos).toEqual([todo]);
    expect(args()).toEqual([
      "-l",
      "JavaScript",
      "/pfad/things-read.jxa",
      JSON.stringify({ source: "search", query, limit: 5 }),
    ]);
  });

  it("macht aus einer Fehlerantwort einen ThingsReadError mit Code", async () => {
    const { runner } = fakeRunner(JSON.stringify({ error: "tag_not_found", message: "No tag" }));
    await expect(
      readTodos({ source: "tag", tag: "skill", limit: 5 }, runner)
    ).rejects.toMatchObject({ code: "tag_not_found", message: "No tag (tag_not_found)" });
  });

  it("weist kaputte oder unerwartete Ausgabe ab", async () => {
    for (const reply of ["kein json", JSON.stringify({ todos: "x" })]) {
      const { runner } = fakeRunner(reply);
      const error = await readTodos({ source: "list", list: "today", limit: 5 }, runner).catch(
        (e) => e
      );
      expect(error).toBeInstanceOf(ThingsReadError);
      expect(error.code).toBe("bad_output");
    }
  });
});

describe("scripts/things-read.jxa ohne Things", () => {
  const jxa = (arg: string) =>
    JSON.parse(
      execFileSync("/usr/bin/osascript", ["-l", "JavaScript", readScript, arg]).toString()
    );

  it("besteht den Selbsttest (Datum lokal, Tags, Listen-IDs)", () => {
    expect(jxa(JSON.stringify({ source: "selftest" }))).toEqual({
      source: "selftest",
      checks: 7,
      failed: 0,
    });
  });

  it("meldet eine kaputte Anfrage als bad_request", () => {
    expect(jxa("kein json").error).toBe("bad_request");
  });
});

describe("Lesewerkzeuge im Server", () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startServer();
  });

  afterAll(async () => {
    await h?.close();
  });

  it("meldet die fuenf Lesewerkzeuge mit Beschreibung", async () => {
    const { tools } = await h.client.listTools();
    for (const name of [
      "list-todos",
      "todos-by-tag",
      "todos-by-project",
      "todos-by-area",
      "search-todos",
    ]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool?.description).toContain("read-only");
    }
  });

  it("weist ungueltige Anfragen ab, bevor Things gefragt wird", async () => {
    const calls: [string, Record<string, unknown>][] = [
      ["list-todos", { list: "papierkorb" }],
      ["list-todos", { list: "today", limit: 0 }],
      ["list-todos", { list: "today", limit: 501 }],
      ["todos-by-tag", { tag: "" }],
      ["todos-by-project", {}],
      ["todos-by-project", { id: "P1", name: "Projekt" }],
      ["todos-by-area", {}],
      ["search-todos", { query: "" }],
    ];
    for (const [name, args] of calls) {
      let text: string;
      try {
        const result = await h.client.callTool({ name, arguments: args });
        expect(result.isError).toBe(true);
        text = resultText(result);
      } catch (error) {
        text = String(error);
      }
      expect(text.length).toBeGreaterThan(0);
    }
    expect(h.openedUrls()).toEqual([]);
  });
});
