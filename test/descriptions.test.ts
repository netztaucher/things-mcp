import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, type Harness } from "./helpers/server-harness.js";

// Jedes Werkzeug braucht eine Beschreibung: Agenten waehlen danach aus, und ohne
// sie bleibt offen, ob ein Werkzeug schreibt, nur die Oberflaeche oeffnet oder
// das Token braucht. Prueft gegen dist/index.js (tools/list).

const EXPECTED_TOOLS = [
  "add-project",
  "add-todo",
  "create-structured-project",
  "evaluate",
  "json",
  "list-todos",
  "restructure-project",
  "search",
  "search-todos",
  "show",
  "todos-by-area",
  "todos-by-project",
  "todos-by-tag",
  "update",
  "update-project",
  "version",
];

describe("Werkzeug-Beschreibungen", () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startServer();
  });

  afterAll(async () => {
    await h?.close();
  });

  it("meldet genau die 16 erwarteten Werkzeuge", async () => {
    const { tools } = await h.client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  it("jedes Werkzeug hat eine nicht-leere Beschreibung", async () => {
    const { tools } = await h.client.listTools();
    const missing = tools
      .filter((t) => typeof t.description !== "string" || t.description.trim() === "")
      .map((t) => t.name)
      .sort();
    expect(missing).toEqual([]);
  });
});
