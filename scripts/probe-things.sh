#!/bin/bash
# Probe gegen echtes Things 3: legt ueber dist/index.js (MCP, stdio) ein Todo an,
# liest es per AppleScript zurueck, vergleicht Titel, Notiz und festes Datum
# (when YYYY-MM-DD) und loescht es.
# Zweiter Teil: startet beide Oeffner-Wege aus dist/opener.js und liest sofort
# ps -p <pid>. Kontrolle (open, ohne Token) muss die URL zeigen, der stdin-Weg
# (osascript, Attrappen-Token) nicht. Kein echtes Token noetig.
# Dritter Teil: liest ueber die Lesewerkzeuge (list-todos, search-todos,
# todos-by-tag, todos-by-project, todos-by-area) die eben angelegten Todos
# zurueck. Nutzt einen vorhandenen Tag und Bereich, legt keine neuen an.
# Vierter Teil, nur mit Token in der Umgebung: update auf das Probe-Todo.
#   op run --env-file="$HOME/.config/things-mcp/op.env" -- scripts/probe-things.sh
# Things muss laufen. Nur macOS. Aufruf aus dem Checkout: scripts/probe-things.sh
#
# Test:     ja - echter Lauf gegen Things 3, Ausgabe im PR (Teil 1 in #2, Token-Weg in #3, Datum in #4, Lesen in #5, update mit Token in #6) · netztaucher/things-mcp#6
# Rueckweg: ja - trap loescht alle Probe-Todos und das Probe-Projekt (Things-Papierkorb), im Lauf belegt · netztaucher/things-mcp#6

set -euo pipefail

cd "$(dirname "$0")/.."
[ -f dist/index.js ] || { echo "dist/index.js fehlt, erst pnpm build" >&2; exit 1; }

STAMP="$(date +%Y%m%d-%H%M%S)"
TITLE="mcp-probe ${STAMP} a b+c & x"
TITLE2="mcp-probe mcpprobe${STAMP//-/}tokenweg"
PROJECT="mcp-probe projekt ${STAMP}"
PTODO="mcp-probe im projekt ${STAMP}"
# Vorhandener Tag und Bereich fuer die Lese-Probe, es wird nichts neu angelegt.
PROBE_TAG="$(osascript -l JavaScript -e 'Application("Things3").tags.name()[0]')"
PROBE_AREA="$(osascript -l JavaScript -e 'Application("Things3").areas.id()[0]')"
NOTES="Zeile eins mit Leerzeichen
Zeile zwei: 100% + mehr"
# Festes Datum in 40 Tagen, als when YYYY-MM-DD.
WHEN="$(date -v+40d +%Y-%m-%d)"

# Liest Todos mit genau diesem Titel als JSON (id, name, notes). Titel per argv, nicht per Shell.
read_back() {
  PROBE_NAME="$1" osascript -l JavaScript <<'JXA'
function run() {
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;
  const name = app.systemAttribute("PROBE_NAME");
  const things = Application("Things3");
  const hits = things.toDos.whose({ name: name })();
  const day = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : null;
  return JSON.stringify(hits.map((t) => ({ id: t.id(), name: t.name(), notes: t.notes(), activation: day(t.activationDate()) })));
}
JXA
}

delete_probe() {
  local ids t
  for t in "$TITLE" "$TITLE geaendert" "$TITLE2" "$TITLE2 kontrolle" "$PTODO"; do
  ids="$(read_back "$t" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).map(t=>t.id).join(" ")))')"
  for id in $ids; do
    osascript -l JavaScript - "$id" <<'JXA' >/dev/null
function run(argv) {
  const things = Application("Things3");
  things.delete(things.toDos.byId(argv[0]));
}
JXA
    echo "geloescht: $id"
  done
  done
  PROBE_NAME="$PROJECT" osascript -l JavaScript <<'JXA'
function run() {
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;
  const name = app.systemAttribute("PROBE_NAME");
  const things = Application("Things3");
  const hits = things.projects.whose({ name: name })();
  hits.forEach((p) => things.delete(p));
  return hits.map((p) => "geloescht: Projekt " + p.id()).join("\n");
}
JXA
}
trap delete_probe EXIT

echo "1. anlegen ueber dist/index.js (add-todo)"
node --input-type=module - "$TITLE" "$NOTES" "$WHEN" "$PROBE_TAG" <<'NODE'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const [title, notes, when, tag] = process.argv.slice(2);
const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"] });
const client = new Client({ name: "probe-things", version: "0" });
await client.connect(transport);
const result = await client.callTool({ name: "add-todo", arguments: { title, notes, when, tags: [tag] } });
console.log("   Antwort:", result.content[0].text);
await client.close();
NODE

echo "2. zuruecklesen per AppleScript"
FOUND=""
for _ in 1 2 3 4 5; do
  sleep 1
  FOUND="$(read_back "$TITLE")"
  [ "$FOUND" != "[]" ] && break
done

node -e '
const [found, title, notes, when] = process.argv.slice(1);
const hits = JSON.parse(found);
if (hits.length !== 1) { console.error("   FEHLER: " + hits.length + " Treffer statt 1"); process.exit(1); }
const t = hits[0];
const ok = t.name === title && t.notes === notes && t.activation === when;
console.log("   id:   " + t.id);
console.log("   name: " + JSON.stringify(t.name));
console.log("   notes:" + JSON.stringify(t.notes));
console.log("   when: " + when + " -> Aktivierung " + t.activation);
console.log(ok ? "   OK: Titel, Notiz und Datum stimmen" : "   FEHLER: Abweichung");
process.exit(ok ? 0 : 1);
' "$FOUND" "$TITLE" "$NOTES" "$WHEN"

echo "3. Token-Weg: beide Oeffner-Wege starten und sofort per ps -p lesen"
# Kontrolle: URL ohne Token geht an open und muss in ps stehen, sonst misst
# die Probe nichts. Test: URL mit Attrappen-Token geht per stdin an osascript
# und darf in ps nicht stehen. Titel per Umgebung, nicht als Argument.
PROBE_TITLE="$TITLE2" node --input-type=module <<'NODE'
import { spawn, execFileSync } from "child_process";
import { openerCommand } from "./dist/opener.js";
import { thingsQuery } from "./dist/things-url.js";
const title = process.env.PROBE_TITLE;
const marker = title.split(" ")[1];
const cases = [
  ["Kontrolle ohne Token", { title: `${title} kontrolle` }, true],
  ["Test mit Attrappe   ", { title, "auth-token": "attrappe-kein-token" }, false],
];
let ok = true;
for (const [label, params, expectVisible] of cases) {
  const url = `things:///add?${thingsQuery(new URLSearchParams(params))}`;
  const cmd = openerCommand(url);
  const t0 = Date.now();
  const child = spawn(cmd.command, cmd.args, { stdio: [cmd.stdin ? "pipe" : "ignore", "ignore", "ignore"] });
  let seen = "";
  try {
    seen = execFileSync("ps", ["-p", String(child.pid), "-ww", "-o", "args="]).toString();
  } catch {
    seen = "";
  }
  if (cmd.stdin) child.stdin.end(cmd.stdin);
  const code = await new Promise((r) => child.on("close", r));
  const visible = seen.includes(marker);
  const pass = code === 0 && seen !== "" && visible === expectVisible;
  ok &&= pass;
  console.log(`   ${label}: Weg=${cmd.command}, ${Date.now() - t0} ms, URL in ps=${visible} ${pass ? "OK" : "FEHLER"}`);
}
process.exit(ok ? 0 : 1);
NODE
FOUND2=""
for _ in 1 2 3 4 5; do
  sleep 1
  FOUND2="$(read_back "$TITLE2")"
  [ "$FOUND2" != "[]" ] && break
done
[ "$FOUND2" != "[]" ] && echo "   OK: Things hat das Todo ueber den stdin-Weg angelegt" || { echo "   FEHLER: Todo nicht angelegt"; exit 1; }

echo "4. lesen ueber dist/index.js: list-todos, search-todos, todos-by-tag, todos-by-project, todos-by-area"
PROBE_TITLE="$TITLE" PROBE_NOTES="$NOTES" PROBE_WHEN="$WHEN" PROBE_TAG="$PROBE_TAG" PROBE_TITLE2="$TITLE2" \
PROBE_PROJECT="$PROJECT" PROBE_PTODO="$PTODO" PROBE_AREA="$PROBE_AREA" PROBE_STAMP="$STAMP" \
node --input-type=module <<'NODE'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const e = process.env;
const client = new Client({ name: "probe-things", version: "0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"] }));
const call = async (name, args) => {
  const t0 = Date.now();
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(`${name}: ${r.content[0].text}`);
  return { ...JSON.parse(r.content[0].text), ms: Date.now() - t0 };
};
let ok = true;
const check = (label, cond, detail) => {
  ok &&= cond;
  console.log(`   ${cond ? "OK" : "FEHLER"} ${label}${detail ? ": " + detail : ""}`);
};
await client.callTool({
  name: "add-project",
  arguments: { title: e.PROBE_PROJECT, "to-dos": [e.PROBE_PTODO], "area-id": e.PROBE_AREA },
});
await new Promise((r) => setTimeout(r, 1500));

const up = await call("list-todos", { list: "upcoming", limit: 500 });
const t1 = up.todos.find((t) => t.name === e.PROBE_TITLE);
check("list-todos upcoming", Boolean(t1) && t1.activation_date === e.PROBE_WHEN && t1.notes === e.PROBE_NOTES && t1.status === "open",
  `${up.returned}/${up.total}, ${up.ms} ms, activation_date ${t1?.activation_date}`);
const inbox = await call("list-todos", { list: "inbox", limit: 500 });
check("list-todos inbox", inbox.todos.some((t) => t.name === e.PROBE_TITLE2), `${inbox.returned}/${inbox.total}, ${inbox.ms} ms`);
const lb = await call("list-todos", { list: "logbook" });
check("list-todos logbook", lb.returned === Math.min(20, lb.total) && lb.todos.every((t) => t.status !== "open" && t.completion_date),
  `${lb.returned}/${lb.total}, ${lb.ms} ms`);
const found = await call("search-todos", { query: e.PROBE_STAMP });
check("search-todos", found.todos.some((t) => t.name === e.PROBE_TITLE), `${found.total} Treffer, ${found.ms} ms`);
const tagged = await call("todos-by-tag", { tag: e.PROBE_TAG, limit: 500 });
const t2 = tagged.todos.find((t) => t.name === e.PROBE_TITLE);
check("todos-by-tag", Boolean(t2) && t2.tags.includes(e.PROBE_TAG), `Tag ${JSON.stringify(e.PROBE_TAG)}, ${tagged.total} Todos, ${tagged.ms} ms`);
const proj = await call("todos-by-project", { name: e.PROBE_PROJECT });
const t3 = proj.todos.find((t) => t.name === e.PROBE_PTODO);
check("todos-by-project", Boolean(t3) && t3.project?.name === e.PROBE_PROJECT && t3.area?.id === e.PROBE_AREA,
  `${proj.total} Todo, Bereich ${t3?.area?.name}, ${proj.ms} ms`);
const area = await call("todos-by-area", { id: e.PROBE_AREA, limit: 500 });
check("todos-by-area", area.todos.some((t) => t.name === e.PROBE_PTODO), `${area.total} Todos, ${area.ms} ms`);
const noTag = await client.callTool({ name: "todos-by-tag", arguments: { tag: "gibt-es-nicht-" + e.PROBE_STAMP } });
check("todos-by-tag unbekannter Tag", noTag.isError === true && noTag.content[0].text.includes("tag_not_found"), noTag.content[0].text);
await client.close();
process.exit(ok ? 0 : 1);
NODE

echo "5. update mit echtem Token (nur wenn THINGS_AUTH_TOKEN gesetzt, z. B. unter op run)"
if [ -z "${THINGS_AUTH_TOKEN:-}" ]; then
  echo "   uebersprungen: THINGS_AUTH_TOKEN nicht gesetzt"
else
  PROBE_ID="$(read_back "$TITLE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0]?.id ?? ""))')"
  # Das Token geht nur ueber die Umgebung an dist/index.js. Der StdioClientTransport
  # erbt die Umgebung nicht von selbst, deshalb env ausdruecklich.
  PROBE_ID="$PROBE_ID" PROBE_TITLE="$TITLE" node --input-type=module <<'NODE'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const e = process.env;
const client = new Client({ name: "probe-things", version: "0" });
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"], env: { ...process.env } })
);
const r = await client.callTool({
  name: "update",
  arguments: { id: e.PROBE_ID, title: `${e.PROBE_TITLE} geaendert`, "append-notes": "Zeile drei per update" },
});
const text = r.content.map((c) => c.text ?? "").join("\n");
console.log("   Antwort:", text);
// Vergleich im Prozess, der Wert wird nie ausgegeben.
const leak = text.includes(e.THINGS_AUTH_TOKEN);
console.log(`   ${leak ? "FEHLER: Token in der Antwort" : "OK: Token in keiner Antwort"}`);
await client.close();
process.exit(r.isError || leak ? 1 : 0);
NODE
  FOUND3=""
  for _ in 1 2 3 4 5; do
    sleep 1
    FOUND3="$(read_back "$TITLE geaendert")"
    [ "$FOUND3" != "[]" ] && break
  done
  node -e '
const [found, id] = process.argv.slice(1);
const hits = JSON.parse(found);
const t = hits[0];
const ok = hits.length === 1 && t.id === id && t.notes.endsWith("Zeile drei per update");
console.log(ok ? "   OK: Titel geaendert, Notiz ergaenzt, gleiche id " + id : "   FEHLER: update nicht angekommen");
process.exit(ok ? 0 : 1);
' "$FOUND3" "$PROBE_ID"
fi

echo "6. loeschen (trap)"
