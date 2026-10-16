import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { whenProblem, whenSchema } from "../src/when.js";
import { buildAddTodoUrl } from "../src/urls.js";
import { startServer, resultText, type Harness } from "./helpers/server-harness.js";

describe("whenProblem", () => {
  it.each([
    "today",
    "tomorrow",
    "evening",
    "anytime",
    "someday",
    "in 3 days",
    "next tuesday",
    "2026-11-01",
    "2028-02-29",
    "2026-11-02@14:30",
    "2026-11-02@9:05",
    "",
  ])("laesst %j durch", (value) => {
    expect(whenProblem(value)).toBeUndefined();
    expect(whenSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ["2026-02-30", "no such calendar day"],
    ["2027-02-29", "no such calendar day"],
    ["2026-13-01", "no such calendar day"],
    ["2026-11-1", "use YYYY-MM-DD"],
    ["01.11.2026", "use YYYY-MM-DD"],
    ["11/01/2026", "use YYYY-MM-DD"],
    ["2026-11-01T10:00:00Z", "use YYYY-MM-DD"],
    ["2026-11-02@24:00", "Invalid time"],
  ])("weist %j ab", (value, message) => {
    expect(whenProblem(value)).toContain(message);
    expect(whenSchema.safeParse(value).success).toBe(false);
  });
});

describe("festes Datum in der URL", () => {
  it("geht unveraendert als when an Things", () => {
    expect(buildAddTodoUrl({ title: "a", when: "2026-11-01" })).toBe(
      "things:///add?title=a&when=2026-11-01"
    );
    expect(buildAddTodoUrl({ title: "a", when: "2026-11-02@14:30" })).toBe(
      "things:///add?title=a&when=2026-11-02%4014%3A30"
    );
  });
});

describe("Server prueft when", () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startServer({ THINGS_AUTH_TOKEN: "test" });
  });

  afterAll(async () => {
    await h?.close();
  });

  it("nimmt YYYY-MM-DD in add-todo und add-project", async () => {
    await h.client.callTool({ name: "add-todo", arguments: { title: "a", when: "2026-11-01" } });
    await h.client.callTool({ name: "add-project", arguments: { title: "p", when: "2026-12-24" } });
    expect(h.openedUrls()).toEqual([
      "things:///add?title=a&when=2026-11-01",
      "things:///add-project?title=p&when=2026-12-24",
    ]);
  });

  it("weist ungueltige Daten ab, bevor etwas geoeffnet wird", async () => {
    const before = h.openedUrls().length;
    const calls: [string, Record<string, unknown>][] = [
      ["add-todo", { title: "a", when: "2026-02-30" }],
      ["add-project", { title: "p", when: "01.11.2026" }],
      ["update", { id: "X", when: "2026-13-01" }],
      ["update-project", { id: "P", when: "2026-11-01@25:00" }],
      [
        "create-structured-project",
        { project: { title: "S", items: [{ type: "to-do", title: "t", when: "2026-02-30" }] } },
      ],
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
      expect(text).toMatch(/Invalid (date|time)/);
    }
    expect(h.openedUrls().length).toBe(before);
    expect(h.osascriptStdin()).toEqual([]);
  });

  it("beschreibt das Datumsformat im Schema", async () => {
    const { tools } = await h.client.listTools();
    const addTodo = tools.find((t) => t.name === "add-todo");
    const when = (addTodo?.inputSchema.properties as Record<string, { description?: string }>).when;
    expect(when.description).toContain("YYYY-MM-DD");
  });
});
