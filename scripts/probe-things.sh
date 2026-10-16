#!/bin/bash
# Probe gegen echtes Things 3: legt ueber dist/index.js (MCP, stdio) ein Todo an,
# liest es per AppleScript zurueck, vergleicht Titel und Notiz und loescht es.
# Zweiter Teil: startet beide Oeffner-Wege aus dist/opener.js und liest sofort
# ps -p <pid>. Kontrolle (open, ohne Token) muss die URL zeigen, der stdin-Weg
# (osascript, Attrappen-Token) nicht. Kein echtes Token noetig.
# Things muss laufen. Nur macOS. Aufruf aus dem Checkout: scripts/probe-things.sh
#
# Test:     ja - echter Lauf gegen Things 3, Ausgabe im PR (Teil 1 in #2, Token-Weg in #3) · netztaucher/things-mcp#3
# Rueckweg: ja - trap loescht alle Probe-Todos (Things-Papierkorb), im Lauf belegt · netztaucher/things-mcp#3

set -euo pipefail

cd "$(dirname "$0")/.."
[ -f dist/index.js ] || { echo "dist/index.js fehlt, erst pnpm build" >&2; exit 1; }

STAMP="$(date +%Y%m%d-%H%M%S)"
TITLE="mcp-probe ${STAMP} a b+c & x"
TITLE2="mcp-probe mcpprobe${STAMP//-/}tokenweg"
NOTES="Zeile eins mit Leerzeichen
Zeile zwei: 100% + mehr"

# Liest Todos mit genau diesem Titel als JSON (id, name, notes). Titel per argv, nicht per Shell.
read_back() {
  PROBE_NAME="$1" osascript -l JavaScript <<'JXA'
function run() {
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;
  const name = app.systemAttribute("PROBE_NAME");
  const things = Application("Things3");
  const hits = things.toDos.whose({ name: name })();
  return JSON.stringify(hits.map((t) => ({ id: t.id(), name: t.name(), notes: t.notes() })));
}
JXA
}

delete_probe() {
  local ids t
  for t in "$TITLE" "$TITLE2" "$TITLE2 kontrolle"; do
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
}
trap delete_probe EXIT

echo "1. anlegen ueber dist/index.js (add-todo)"
node --input-type=module - "$TITLE" "$NOTES" <<'NODE'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const [title, notes] = process.argv.slice(2);
const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"] });
const client = new Client({ name: "probe-things", version: "0" });
await client.connect(transport);
const result = await client.callTool({ name: "add-todo", arguments: { title, notes } });
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
const [found, title, notes] = process.argv.slice(1);
const hits = JSON.parse(found);
if (hits.length !== 1) { console.error("   FEHLER: " + hits.length + " Treffer statt 1"); process.exit(1); }
const t = hits[0];
const ok = t.name === title && t.notes === notes;
console.log("   id:   " + t.id);
console.log("   name: " + JSON.stringify(t.name));
console.log("   notes:" + JSON.stringify(t.notes));
console.log(ok ? "   OK: Titel und Notiz stimmen zeichengenau" : "   FEHLER: Abweichung");
process.exit(ok ? 0 : 1);
' "$FOUND" "$TITLE" "$NOTES"

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

echo "4. loeschen (trap)"
