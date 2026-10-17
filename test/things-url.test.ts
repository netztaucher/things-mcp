import { describe, it, expect } from "vitest";
import { thingsQuery } from "../src/things-url.js";

describe("thingsQuery", () => {
  it("kodiert Leerzeichen als %20, nicht als +", () => {
    const params = new URLSearchParams();
    params.set("title", "Tyme abrechnen");
    params.set("notes", "Zeile eins\nZeile zwei");
    const query = thingsQuery(params);
    expect(query).toBe("title=Tyme%20abrechnen&notes=Zeile%20eins%0AZeile%20zwei");
    expect(query).not.toContain("+");
  });

  it("laesst ein echtes Pluszeichen als %2B stehen", () => {
    const params = new URLSearchParams();
    params.set("title", "C++ lernen");
    expect(thingsQuery(params)).toBe("title=C%2B%2B%20lernen");
  });

  it("ergibt nach dem Dekodieren wieder den Originaltext", () => {
    const params = new URLSearchParams();
    const titel = "Tyme abrechnen: RE-NT 1+2 · Montag";
    params.set("title", titel);
    const wert = thingsQuery(params).slice("title=".length);
    expect(decodeURIComponent(wert)).toBe(titel);
  });
});
