import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, resultText, type Harness } from "./helpers/server-harness.js";

// Ende-zu-Ende gegen dist/index.js: echter MCP-Server, `open` durch einen
// Mitschreiber ersetzt. Braucht vorher `pnpm build` (pnpm test erledigt das).

describe("MCP-Server ueber stdio", () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startServer();
  });

  afterAll(async () => {
    await h?.close();
  });

  it("meldet die erwarteten Werkzeuge", async () => {
    const { tools } = await h.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      expect.arrayContaining([
        "add-project",
        "add-todo",
        "create-structured-project",
        "evaluate",
        "json",
        "restructure-project",
        "search",
        "show",
        "update",
        "update-project",
        "version",
      ])
    );
  });

  it("add-todo gibt die URL mit %20 an open", async () => {
    const before = h.openedUrls().length;
    const result = await h.client.callTool({
      name: "add-todo",
      arguments: { title: "Probe mit Leerzeichen", tags: ["a b"] },
    });
    expect(resultText(result)).toContain("created successfully");
    const urls = h.openedUrls().slice(before);
    expect(urls).toEqual(["things:///add?title=Probe%20mit%20Leerzeichen&tags=a%20b"]);
  });

  it("show mit Filter oeffnet things:///show", async () => {
    const before = h.openedUrls().length;
    await h.client.callTool({ name: "show", arguments: { id: "today", filter: ["skill"] } });
    expect(h.openedUrls().slice(before)).toEqual(["things:///show?id=today&filter=skill"]);
  });
});
