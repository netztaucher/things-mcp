import { describe, it, expect } from "vitest";
import {
  buildAddProjectUrl,
  buildAddTodoUrl,
  buildJsonUrl,
  buildSearchUrl,
  buildShowUrl,
  buildUpdateProjectUrl,
  buildUpdateUrl,
} from "../src/urls.js";

// Zerlegt eine things:///-URL in Befehl und dekodierte Parameter.
function parse(url: string) {
  const match = url.match(/^things:\/\/\/([a-z-]+)\?(.*)$/);
  if (!match) throw new Error(`keine Things-URL: ${url}`);
  return { command: match[1], query: match[2], params: new URLSearchParams(match[2]) };
}

describe("buildAddTodoUrl", () => {
  it("baut add mit Titel, Notiz, Tags und Checkliste", () => {
    const url = buildAddTodoUrl({
      title: "Tyme abrechnen",
      notes: "Zeile eins\nZeile zwei",
      when: "today",
      deadline: "2026-10-31",
      tags: ["arbeit", "skill"],
      "checklist-items": ["eins", "zwei"],
      "list-id": "ABC",
      reveal: true,
    });
    expect(url).toBe(
      "things:///add?title=Tyme%20abrechnen&notes=Zeile%20eins%0AZeile%20zwei&when=today" +
        "&deadline=2026-10-31&tags=arbeit%2Cskill&checklist-items=eins%0Azwei&list-id=ABC&reveal=true"
    );
  });

  it("kodiert Leerzeichen nie als +", () => {
    const url = buildAddTodoUrl({ title: "a b c", notes: "x y" });
    expect(url).not.toContain("+");
    expect(parse(url).params.get("title")).toBe("a b c");
  });

  it("bevorzugt titles vor title", () => {
    const { params } = parse(buildAddTodoUrl({ title: "eins", titles: "a\nb" }));
    expect(params.get("titles")).toBe("a\nb");
    expect(params.has("title")).toBe(false);
  });

  it("laesst leere Felder weg und schreibt false als Text", () => {
    const { params } = parse(buildAddTodoUrl({ title: "t", tags: [], completed: false }));
    expect(params.has("tags")).toBe(false);
    expect(params.get("completed")).toBe("false");
  });

  it("haelt Sonderzeichen gegen Parameter-Einschleusung dicht", () => {
    const url = buildAddTodoUrl({ title: "a&auth-token=x#y", notes: "$(rm -rf ~)" });
    const { params } = parse(url);
    expect(params.get("title")).toBe("a&auth-token=x#y");
    expect(params.has("auth-token")).toBe(false);
    expect(params.get("notes")).toBe("$(rm -rf ~)");
  });
});

describe("buildAddProjectUrl", () => {
  it("baut add-project mit Todos als Zeilen", () => {
    const url = buildAddProjectUrl({
      title: "Neues Projekt",
      "to-dos": ["a", "b c"],
      area: "Arbeit",
    });
    expect(url).toBe("things:///add-project?title=Neues%20Projekt&area=Arbeit&to-dos=a%0Ab%20c");
  });
});

describe("buildUpdateUrl", () => {
  it("setzt id und auth-token vorn und uebernimmt leere Notiz", () => {
    const { command, params } = parse(
      buildUpdateUrl({ id: "X1", notes: "", "add-tags": ["a", "b"], completed: true }, "TOKEN")
    );
    expect(command).toBe("update");
    expect([...params.keys()].slice(0, 2)).toEqual(["id", "auth-token"]);
    expect(params.get("notes")).toBe("");
    expect(params.get("add-tags")).toBe("a,b");
    expect(params.get("completed")).toBe("true");
  });
});

describe("buildUpdateProjectUrl", () => {
  it("baut update-project", () => {
    const { command, params } = parse(
      buildUpdateProjectUrl({ id: "P1", title: "Neu", "area-id": "A1" }, "TOKEN")
    );
    expect(command).toBe("update-project");
    expect(params.get("title")).toBe("Neu");
    expect(params.get("area-id")).toBe("A1");
  });
});

describe("buildJsonUrl", () => {
  it("legt data als JSON-Text ab, ohne Token wenn keins da", () => {
    const data = JSON.stringify([{ type: "to-do", attributes: { title: "a b" } }]);
    const { command, params, query } = parse(buildJsonUrl(data, { reveal: false }));
    expect(command).toBe("json");
    expect(params.has("auth-token")).toBe(false);
    expect(JSON.parse(params.get("data") ?? "")).toEqual(JSON.parse(data));
    expect(params.get("reveal")).toBe("false");
    expect(query).not.toContain("+");
  });

  it("setzt das Token, wenn es mitkommt", () => {
    const { params } = parse(buildJsonUrl("[]", { authToken: "T" }));
    expect(params.get("auth-token")).toBe("T");
  });
});

describe("buildShowUrl und buildSearchUrl", () => {
  it("bevorzugt id vor query und haengt den Filter an", () => {
    const { params } = parse(buildShowUrl({ id: "today", query: "x", filter: ["skill", "a b"] }));
    expect(params.get("id")).toBe("today");
    expect(params.has("query")).toBe(false);
    expect(params.get("filter")).toBe("skill,a b");
  });

  it("baut search mit und ohne Suchbegriff", () => {
    expect(buildSearchUrl("tyme rechnung")).toBe("things:///search?query=tyme%20rechnung");
    expect(buildSearchUrl()).toBe("things:///search?");
  });
});
