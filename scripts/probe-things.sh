#!/bin/bash
# Probe gegen echtes Things 3: legt ueber dist/index.js (MCP, stdio) ein Todo an,
# liest es per AppleScript zurueck, vergleicht Titel und Notiz und loescht es.
# Things muss laufen. Nur macOS. Aufruf aus dem Checkout: scripts/probe-things.sh
#
# Test:     ja - echter Lauf gegen Things 3, Ausgabe im PR · netztaucher/things-mcp#2
# Rueckweg: ja - trap loescht das Probe-Todo (landet im Things-Papierkorb), im Lauf belegt · netztaucher/things-mcp#2

set -euo pipefail

cd "$(dirname "$0")/.."
[ -f dist/index.js ] || { echo "dist/index.js fehlt, erst pnpm build" >&2; exit 1; }

STAMP="$(date +%Y%m%d-%H%M%S)"
TITLE="mcp-probe ${STAMP} a b+c & x"
NOTES="Zeile eins mit Leerzeichen
Zeile zwei: 100% + mehr"

# Liest Todos mit genau diesem Titel als JSON (id, name, notes). Titel per argv, nicht per Shell.
read_back() {
  osascript -l JavaScript - "$1" <<'JXA'
function run(argv) {
  const things = Application("Things3");
  const hits = things.toDos.whose({ name: argv[0] })();
  return JSON.stringify(hits.map((t) => ({ id: t.id(), name: t.name(), notes: t.notes() })));
}
JXA
}

delete_probe() {
  local ids
  ids="$(read_back "$TITLE" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).map(t=>t.id).join(" ")))')"
  for id in $ids; do
    osascript -l JavaScript - "$id" <<'JXA' >/dev/null
function run(argv) {
  const things = Application("Things3");
  things.delete(things.toDos.byId(argv[0]));
}
JXA
    echo "geloescht: $id"
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

echo "3. loeschen (trap)"
