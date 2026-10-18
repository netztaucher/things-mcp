# things-mcp (Fork netztaucher)

MCP-Server fuer [Things 3](https://culturedcode.com/things/) auf dem Mac. Er legt Todos und Projekte an, aendert sie, baut Projekte um und liest Todos als Daten zurueck. Schreiben laeuft ueber das [Things-URL-Schema](https://culturedcode.com/things/support/articles/2803573/), Lesen ueber JavaScript for Automation (JXA).

Herkunft: [jimfilippou/things-mcp](https://github.com/jimfilippou/things-mcp) → [kevinberny/things-mcp](https://github.com/kevinberny/things-mcp) → dieser Fork. Das npm-Paket `things-mcp` (0.1.0) ist veraltet und hat den Leerzeichen-Fehler. Der Server laeuft deshalb aus diesem Checkout, nicht per `npx`.

## Inhalt

- [Werkzeuge](#werkzeuge)
- [Einrichten](#einrichten)
- [Token](#token)
- [Werkzeuge im Detail](#werkzeuge-im-detail)
- [Entwicklung](#entwicklung)
- [Abweichungen vom Upstream](#abweichungen-vom-upstream)
- [Fehlerbehebung](#fehlerbehebung)

## Werkzeuge

| Gruppe | Werkzeug | Zweck | Token |
|---|---|---|---|
| Anlegen | `add-todo` | ein oder mehrere Todos | nein |
| | `add-project` | Projekt mit Todo-Titeln | nein |
| | `create-structured-project` | Projekt mit Ueberschriften, Todos, Checklisten | nur fuer Updates |
| | `json` | beliebige Things-JSON-Befehle | nur fuer Updates |
| Aendern | `update` | Todo aendern | ja |
| | `update-project` | Projekt aendern | ja |
| | `restructure-project` | Ueberschriften anlegen, umbenennen, loeschen, Todos verschieben | ja |
| Lesen | `list-todos` | Eingang, Heute, Geplant, Jederzeit, Irgendwann, Logbuch | nein |
| | `todos-by-tag` | offene Todos mit einem Tag | nein |
| | `todos-by-project` | offene Todos eines Projekts | nein |
| | `todos-by-area` | offene Todos eines Bereichs und seiner Projekte | nein |
| | `search-todos` | offene Todos mit Text in Titel oder Notiz | nein |
| | `evaluate` | ein Element per ID oder Things-Link | nein |
| Oberflaeche | `show` | Liste oder Element in Things oeffnen | nein |
| | `search` | Suche in Things oeffnen | nein |
| | `version` | Things-Version anzeigen lassen | nein |

`show` und `search` oeffnen nur die Things-Oberflaeche und geben nichts zurueck. Fuer Daten die Lesewerkzeuge nehmen.

## Einrichten

Voraussetzungen: macOS, Things 3, Node.js 18 oder neuer, pnpm, 1Password-CLI `op` (fuer das Token).

Bauen:

```bash
pnpm install --frozen-lockfile && pnpm run build
```

Things → Einstellungen → Allgemein → "Things-URLs aktivieren" muss an sein.

### In der NT-Infrastruktur

Der Eintrag `things` steht in NT-Brain `core/config/mcps.json`. Der Generator schreibt daraus `~/.claude.json` und die Claude-Desktop-Konfiguration. Abgleich ohne zu schreiben:

```bash
python3 core/bin/generate-tool-configs.py --check
```

Erzeugter Eintrag:

```json
"things": {
  "command": "sh",
  "args": ["-c", "exec /opt/homebrew/bin/op run -- \"$HOME/.local/bin/node-bridge.sh\" \"$HOME/_dev/things-mcp/dist/index.js\""],
  "env": { "THINGS_AUTH_TOKEN": "op://NT-Brain/infra-api-keys/THINGS_AUTH_TOKEN" }
}
```

In `env` steht nur der 1Password-Verweis. `op run` loest ihn beim Start auf und gibt das Token als Umgebungsvariable an den Server. `node-bridge.sh` findet `node` auch dort, wo GUI-Apps keinen Homebrew-PATH haben.

### Ohne NT-Infrastruktur

Referenzdatei mit dem Verweis (kein Wert):

```bash
mkdir -p ~/.config/things-mcp && printf '%s\n' 'THINGS_AUTH_TOKEN=op://NT-Brain/infra-api-keys/THINGS_AUTH_TOKEN' > ~/.config/things-mcp/op.env
```

MCP-Konfiguration:

```json
"things": {
  "command": "/opt/homebrew/bin/op",
  "args": ["run", "--env-file=/Users/<nutzer>/.config/things-mcp/op.env", "--", "node", "<checkout>/dist/index.js"]
}
```

Ohne Token: `"command": "node", "args": ["<checkout>/dist/index.js"]`. Dann laufen alle Werkzeuge ausser `update`, `update-project` und `restructure-project`.

Nach jeder Aenderung an der Konfiguration Claude Desktop bzw. die Claude-Code-Sitzung neu starten.

## Token

Things verlangt fuer aendernde URL-Befehle ein Token (Things → Einstellungen → Allgemein → Things-URLs aktivieren → Verwalten). Es liegt in 1Password unter `op://NT-Brain/infra-api-keys/THINGS_AUTH_TOKEN`.

- Der Server liest das Token nur aus `THINGS_AUTH_TOKEN`. Kein Werkzeug hat einen Parameter `auth-token`, ein mitgegebener wird verworfen.
- Fehlt das Token, melden `update` & Co. `THINGS_AUTH_TOKEN is not set` und oeffnen nichts. Meldungen nennen nie den Wert.
- URLs mit Token gehen per stdin an `osascript`, das sie ueber `NSWorkspace` oeffnet (`src/opener.ts`), nicht als Argument an `open`.
- Neu setzen nur in der 1Password-App, nicht per `op item edit ... THINGS_AUTH_TOKEN=<wert>`: dann steht der Wert in Prozessliste und Shell-Historie. Rotation nach Lex Clavis.

Pruefen ohne den Wert zu sehen (Stand 2026-10-16: 22 Zeichen, sha256-12 `4dce2791ce8e`):

```bash
op read "op://NT-Brain/infra-api-keys/THINGS_AUTH_TOKEN" | shasum -a 256 | cut -c1-12
```

Warum stdin und Umgebung (gemessen 2026-10-16, macOS 27.0.1):
- Prozessargumente sind unter macOS fuer alle lokalen Nutzer lesbar (`ps -axww -o args`). Upstream gibt jede URL an `open`, mit Token also das Token, rund 60 bis 105 ms lang. `scripts/probe-things.sh` startet beide Wege und liest sofort `ps -p <pid>`: `open` zeigt die URL, der stdin-Weg nicht.
- Umgebungsvariablen zeigt `ps` ohne root nicht, auch nicht fuer eigene Prozesse. root und Endpoint-Security-Werkzeuge sehen sie.
- MCP ueber stdio laeuft durch `op run` unveraendert, der Start dauert rund 7 s statt unter 1 s.

## Werkzeuge im Detail

### when und deadline

`when`: `today`, `tomorrow`, `evening`, `anytime`, `someday`, festes Datum `YYYY-MM-DD`, Datum mit Erinnerung `YYYY-MM-DD@HH:MM` oder englischer Freitext (`in 3 days`, `next tuesday`). Was wie ein Datum aussieht, wird vorher geprueft (`src/when.ts`): `2026-02-30`, `01.11.2026` oder ein ISO-Zeitstempel werden abgelehnt, bevor etwas an Things geht.

`deadline`: Datum `YYYY-MM-DD`, wird unveraendert durchgereicht.

### Anlegen

- `add-todo`: `title` oder `titles` (mehrere, je Zeile eins), `notes`, `when`, `deadline`, `tags`, `checklist-items`, `list` bzw. `list-id`, `heading` bzw. `heading-id`, `completed`, `canceled`, `reveal`, `show-quick-entry`, `use-clipboard`, `creation-date`, `completion-date`.
- `add-project`: `title`, `notes`, `when`, `deadline`, `tags`, `area` bzw. `area-id`, `to-dos` (Titel), `completed`, `canceled`, `reveal`, `creation-date`, `completion-date`.
- `create-structured-project`: `project` mit echten Ueberschriften und verschachtelten Todos, `reveal`. Beispiel fuer `project`:

  ```json
  {
    "title": "Einkauf",
    "items": [
      { "type": "heading", "title": "Obst", "items": [{ "type": "to-do", "title": "2 Avocados", "when": "today" }] },
      { "type": "to-do", "title": "Milch", "checklistItems": ["Hafer", "Kuh"] }
    ]
  }
  ```
- `json`: `data` als JSON-Text im Things-JSON-Format, `reveal`.

Tags muessen in Things schon existieren, unbekannte ignoriert Things.

### Aendern (Token noetig)

- `update`: `id` und die Felder von `add-todo` sinngemaess, dazu `prepend-notes`, `append-notes`, `add-tags`, `prepend-checklist-items`, `append-checklist-items`, `duplicate`. `when` und `deadline` gehen nicht bei wiederholenden Todos.
- `update-project`: `id`, Felder wie `add-project`, dazu `prepend-notes`, `append-notes`, `add-tags`, `duplicate`.
- `restructure-project`: `project-id` und `layout`, eine geordnete Liste aus `{ "type": "heading", "id"?, "title"?, "operation"?, "items": [todo-ids] }` und `{ "type": "unsectioned", "items": [todo-ids] }`. Neue Ueberschriften bekommen eine ID, die Antwort nennt sie.

IDs: in Things Rechtsklick → Teilen → Link kopieren, die ID steht in `things:///show?id=<ID>`. Oder aus der Antwort eines Lesewerkzeugs.

### Lesen

Nur lesend, per `osascript` und `scripts/things-read.jxa` (`src/read.ts`). Die Anfrage geht als ein JSON-Argument per `execFile`, nie durch eine Shell.

| Werkzeug | Parameter |
|---|---|
| `list-todos` | `list`: `inbox`, `today`, `upcoming`, `anytime`, `someday`, `logbook`; `limit` |
| `todos-by-tag` | `tag` (genauer Name); `limit` |
| `todos-by-project` | `id` oder `name`; `limit` |
| `todos-by-area` | `id` oder `name`; `include-projects` (Standard `true`); `limit` |
| `search-todos` | `query`; `limit` |

`limit` 1 bis 500, Standard 50, im Logbuch 20.

Antwort (JSON als Text):

```json
{
  "source": "tag", "total": 84, "returned": 50, "truncated": true,
  "todos": [{
    "id": "…", "name": "…", "notes": "…", "status": "open",
    "activation_date": "2026-11-25", "due_date": null, "tags": ["dev"],
    "project": { "id": "…", "name": "…" }, "area": { "id": "…", "name": "…" }
  }]
}
```

- Datum als lokales `YYYY-MM-DD`. Im Logbuch zusaetzlich `completion_date`.
- Der Bereich eines Todos in einem Projekt ist der Bereich des Projekts.
- Tag, Projekt, Bereich und Suche liefern nur offene Todos. Erledigtes fuehrt Things nur im Logbuch.
- Unbekannter Tag, Projekt oder Bereich: Fehler `tag_not_found`, `project_not_found`, `area_not_found`. Mehrere Projekte gleichen Namens: `project_ambiguous` mit den IDs.
- Laufzeiten (gemessen mit rund 2.000 offenen Todos und 43.000 im Logbuch): Listen 0,5 bis 1,2 s, Tag mit 84 Todos 3 s, Logbuch mit 20 Eintraegen 2 s.
- Listen werden ueber feste IDs angesprochen (`TMTodayListSource` usw.), weil die Namen lokalisiert sind.

### evaluate, show, search, version

- `evaluate`: `id` oder `url` (`things:///show?id=…`), liefert das Element als JSON. Datumswerte dort in UTC (`toISOString`), Mitternacht MEZ erscheint als Vortag 23:00 Z. Die Lesewerkzeuge rechnen lokal.
- `show`: `id` (auch eingebaute Listen wie `today`) oder `query`, dazu `filter` (Tags). Oeffnet nur die Oberflaeche.
- `search`: `query`. Oeffnet nur die Oberflaeche.
- `version`: oeffnet `things:///version`.

## Entwicklung

```
src/
  index.ts        Server, CLI-Flags, Startpruefung
  tools/          ein Modul je Werkzeug, tools/index.ts registriert alle
  schemas.ts      Zod-Schemas
  urls.ts         reine URL-Bauer
  payloads.ts     JSON fuer things:///json
  things-url.ts   thingsQuery: Leerzeichen als %20
  when.ts         Pruefung von when
  opener.ts       URL oeffnen: open, mit Token per stdin an osascript
  auth.ts         Token nur aus THINGS_AUTH_TOKEN
  read.ts         Lesen ueber things-read.jxa
  paths.ts        Pfade zu den JXA-Skripten
scripts/
  things-read.jxa         Lesewerkzeuge
  things-evaluate-url.jxa evaluate
  probe-things.sh         Probe gegen echtes Things
test/                     Vitest
```

Jedes Werkzeug hat eine Beschreibung im zweiten Argument von `server.tool()`, `test/descriptions.test.ts` prueft das ueber `tools/list`.

Befehle:

```bash
pnpm test          # baut mit tsc, dann vitest
pnpm lint
pnpm type-check
pnpm format:check
```

Tests:
- `urls`, `payloads`, `when`: die echten Funktionen aus `src`.
- `server`, `descriptions`, `token`, `when`, `read`: starten `dist/index.js` als MCP-Server ueber stdio. `open` und `osascript` sind im `PATH` durch Mitschreiber ersetzt, Things wird nicht angefasst.
- `read`: Leser mit Ersatz-osascript, dazu der Selbsttest von `things-read.jxa` ohne Things.
- `descriptions`: alle 16 Werkzeuge gemeldet, jedes mit nicht-leerer Beschreibung.
- `token`: Sentinel-Wert in `THINGS_AUTH_TOKEN`, darf in keiner Antwort, Fehlermeldung, stderr oder Prozessargument auftauchen.

Probe gegen echtes Things (legt an, liest zurueck, loescht alles wieder in den Papierkorb):

```bash
scripts/probe-things.sh
```

Mit `update`-Schritt:

```bash
op run --env-file="$HOME/.config/things-mcp/op.env" -- scripts/probe-things.sh
```

CI (GitHub Actions, macOS, Node 18/20/22): lint, type-check, test, build, format-check. Laeuft fuer alle PRs, auch gestapelte.

## Abweichungen vom Upstream

- Leerzeichen gehen als `%20` an Things, nicht als `+` (jimfilippou/things-mcp#4, Fix aus #2). Upstream-PR: [kevinberny/things-mcp#1](https://github.com/kevinberny/things-mcp/pull/1).
- `evaluate` startet `osascript` per `execFile` statt `exec`, `$(...)` in einer ID wird nicht mehr ausgefuehrt.
- Kein Parameter `auth-token`, Token nur aus der Umgebung, URLs mit Token per stdin.
- Lesewerkzeuge `list-todos`, `todos-by-tag`, `todos-by-project`, `todos-by-area`, `search-todos`.
- `when` prueft Datumsangaben.
- Ein Modul je Werkzeug, URL-Bau in reinen Funktionen, Tests gegen `src` und `dist`.

## Fehlerbehebung

| Meldung oder Verhalten | Ursache | Abhilfe |
|---|---|---|
| `THINGS_AUTH_TOKEN is not set` | Server ohne Token gestartet | Start ueber `op run`, siehe [Einrichten](#einrichten) |
| Things meldet ungueltiges Token | Token in Things neu erzeugt | 1Password-Eintrag aktualisieren, Server neu starten |
| `tag_not_found` | Tag existiert in Things nicht | Tag in Things anlegen oder Namen pruefen |
| `Invalid date ... for when` | kein `YYYY-MM-DD` oder kein echter Tag | Format pruefen |
| Leerzeichen als `+` in Things | alter Server per `npx` | Konfiguration auf diesen Checkout umstellen |
| `JXA script not found` beim Start | `scripts/` fehlt neben `dist/` | im Checkout bauen, nicht `dist/` allein kopieren |
| Start dauert rund 7 s | `op run` fragt 1Password | normal |

## Lizenz und Dank

Ursprung: [things-mcp](https://github.com/jimfilippou/things-mcp) von Dimitrios Filippou, erweitert von [Kevin Berny](https://github.com/kevinberny/things-mcp).

Lizenz offen: `package.json` nennt ISC, die fruehere readme MIT, eine LICENSE-Datei fehlt. Vor einer Veroeffentlichung beim Upstream klaeren.
