import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, resultText, type Harness } from "./helpers/server-harness.js";
import { AUTH_TOKEN_MISSING, optionalAuthToken, requireAuthToken } from "../src/auth.js";
import { containsAuthToken, openerCommand } from "../src/opener.js";

// Spuerbarer Testwert, kein echtes Token.
const SENTINEL = "sentinel-token-4711-nicht-echt";

const TOOLS_WITH_TOKEN = [
  "create-structured-project",
  "json",
  "restructure-project",
  "update",
  "update-project",
];

describe("auth", () => {
  it("liest das Token nur aus THINGS_AUTH_TOKEN", () => {
    expect(requireAuthToken({ THINGS_AUTH_TOKEN: "abc" })).toBe("abc");
    expect(optionalAuthToken({ THINGS_AUTH_TOKEN: "  " })).toBeUndefined();
    expect(() => requireAuthToken({})).toThrow(AUTH_TOKEN_MISSING);
  });
});

describe("opener", () => {
  it("gibt URLs mit Token per stdin an osascript, nie als Argument", () => {
    const url = `things:///update?id=X&auth-token=${SENTINEL}&title=a`;
    const cmd = openerCommand(url);
    expect(cmd.command).toBe("osascript");
    expect(cmd.args.join(" ")).not.toContain(SENTINEL);
    expect(cmd.stdin).toBe(url);
  });

  it("laesst URLs ohne Token wie bisher an open", () => {
    expect(openerCommand("things:///add?title=a")).toEqual({
      command: "open",
      args: ["things:///add?title=a"],
    });
  });

  it("erkennt auth-token nur als Parameter, nicht im Text", () => {
    expect(containsAuthToken("things:///add?title=auth-token")).toBe(false);
    expect(containsAuthToken("things:///json?auth-token=x&data=1")).toBe(true);
  });
});

describe("Server mit Token in der Umgebung", () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startServer({ THINGS_AUTH_TOKEN: SENTINEL });
  });

  afterAll(async () => {
    await h?.close();
  });

  it("bietet keinen auth-token-Parameter mehr an", async () => {
    const { tools } = await h.client.listTools();
    for (const tool of tools) {
      expect(Object.keys(tool.inputSchema.properties ?? {})).not.toContain("auth-token");
    }
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining(TOOLS_WITH_TOKEN));
  });

  it("nennt das Token in keiner Antwort und keiner Fehlermeldung", async () => {
    const calls: [string, Record<string, unknown>][] = [
      ["update", { id: "X1", title: "a b" }],
      ["update-project", { id: "P1", notes: "n" }],
      ["json", { data: "[]" }],
      ["create-structured-project", { project: { title: "S" } }],
      ["restructure-project", { "project-id": "P1", layout: [{ type: "heading", id: "H1" }] }],
      // Fehlerfaelle
      ["restructure-project", { "project-id": "P1", layout: [{ type: "unsectioned" }] }],
      ["update", {}],
      ["update", { id: "X", "auth-token": "per-parameter" }],
      ["evaluate", { id: "a", url: "b" }],
      ["nicht-vorhanden", {}],
    ];

    const texts: string[] = [];
    for (const [name, args] of calls) {
      try {
        texts.push(resultText(await h.client.callTool({ name, arguments: args })));
      } catch (error) {
        texts.push(String(error));
      }
    }

    expect(texts.join("\n")).toContain("updated successfully");
    expect(texts.join("\n")).toContain("No operations generated");
    for (const text of texts) {
      expect(text).not.toContain(SENTINEL);
    }
    expect(h.stderr()).not.toContain(SENTINEL);
  });

  it("gibt das Token nur ueber stdin weiter, nie als Prozessargument", () => {
    expect(h.openedUrls().join("\n")).not.toContain(SENTINEL);
    expect(h.osascriptArgs()).not.toContain(SENTINEL);
    const viaStdin = h.osascriptStdin();
    expect(viaStdin.length).toBeGreaterThanOrEqual(5);
    for (const url of viaStdin) {
      expect(new URLSearchParams(url.split("?")[1]).get("auth-token")).toBe(SENTINEL);
    }
  });

  it("ignoriert ein per Parameter uebergebenes Token", () => {
    const all = [...h.openedUrls(), ...h.osascriptStdin()].join("\n");
    expect(all).not.toContain("per-parameter");
  });
});

describe("Server ohne Token", () => {
  let h: Harness;

  beforeAll(async () => {
    h = await startServer();
  });

  afterAll(async () => {
    await h?.close();
  });

  it("meldet fehlendes THINGS_AUTH_TOKEN und oeffnet nichts", async () => {
    const result = await h.client.callTool({ name: "update", arguments: { id: "X1" } });
    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("THINGS_AUTH_TOKEN is not set");
    expect(h.openedUrls()).toEqual([]);
    expect(h.osascriptStdin()).toEqual([]);
  });

  it("json ohne Token geht ohne auth-token an open", async () => {
    await h.client.callTool({ name: "json", arguments: { data: "[]" } });
    expect(h.openedUrls()).toEqual(["things:///json?data=%5B%5D"]);
  });
});
