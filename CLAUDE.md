# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides integration with the Things 3 productivity app (macOS) via its URL scheme. The server exposes MCP tools that allow AI assistants to create, update, and query todos, projects, headings, and other Things entities.

**Key Technology**: Built with TypeScript, uses `@modelcontextprotocol/sdk` for MCP server implementation, and Zod for runtime validation.

**Platform**: macOS only (requires Things 3 app installed and running).

## Development Commands

```bash
# Build TypeScript to dist/
pnpm build

# Start the MCP server (after building)
pnpm start

# Run directly during development (after building)
node dist/index.js

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type check without emitting
pnpm type-check

# CLI flags
node dist/index.js --version    # Show version
node dist/index.js --help       # Show help
```

## Architecture

### Module layout (`src/`)

- `index.ts`: creates the server, CLI flags, startup validation, stdio transport.
- `tools/<tool>.ts`: one module per tool (`registerAddTodo`, ...), `tools/index.ts` registers them in the original order. Handlers only call builders and `openThingsURL`.
- `read.ts`: `readTodos()` runs `scripts/things-read.jxa` via `execFile` with the request as one JSON argument, validates the answer with Zod, maps `{error}` to `ThingsReadError`.
- `paths.ts`: `evaluateScriptPath` (resolved from `dist/` to `../scripts/things-evaluate-url.jxa`), `evaluateBinary`.
- `opener.ts`: `openThingsURL`. URLs without token go as array argument to `open`; URLs with `auth-token` go via stdin to `osascript` (NSWorkspace), so the token never appears in process arguments.
- `auth.ts`: `requireAuthToken`, `optionalAuthToken`. Token only from `THINGS_AUTH_TOKEN`; messages name the variable, never the value.
- `schemas.ts`: all Zod schemas; the `*Shape` objects are passed to `server.tool()` unchanged, the inferred types feed the builders.
- `urls.ts`: pure URL builders (`buildAddTodoUrl`, `buildAddProjectUrl`, `buildUpdateUrl`, `buildUpdateProjectUrl`, `buildJsonUrl`, `buildShowUrl`, `buildSearchUrl`). No process, no Things, directly testable.
- `payloads.ts`: JSON payloads for `things:///json` (`buildChecklistItems`, `buildTodo`, `buildProjectItems`, `buildStructuredProjectPayload`, `buildRestructurePayload`).
- `when.ts`: `whenSchema` for every `when` field. Keywords and English natural language pass; anything that looks like a date must be `YYYY-MM-DD` or `YYYY-MM-DD@HH:MM` and a real calendar day.
- `things-url.ts`: `thingsQuery()`, encodes spaces as `%20` (Things takes `+` literally).

### Things URL Scheme Integration

All operations construct `things:///` URLs with query parameters:

- Simple operations (add-todo, add-project): Use `URLSearchParams` to build URL directly
- Complex operations (create-structured-project, restructure-project): Build JSON payloads and pass via `data` parameter to `things:///json`
- Update operations (update, update-project): Require auth token from Things settings

**URL encoding**: Always build with `URLSearchParams` and serialize with `thingsQuery()` from `src/things-url.ts` (spaces as `%20`).

### JXA Script Integration

The `evaluate` tool shells out to `scripts/things-evaluate-url.jxa` (JXA = JavaScript for Automation):

- Script path resolved relative to `dist/index.js` as `../scripts/things-evaluate-url.jxa`
- Requires executable permissions (`chmod +x scripts/things-evaluate-url.jxa`)
- Returns JSON representation of Things items (todos, projects, areas, tags)

**Location**: `evaluateScriptPath` in `src/paths.ts`, the tool in `src/tools/evaluate.ts`

### Authorization Token Handling

The token comes only from the `THINGS_AUTH_TOKEN` environment variable (`src/auth.ts`). No tool schema has an `auth-token` parameter; a passed one is stripped by Zod. Never put the token into a tool response, error message, log, or process argument. `test/token.test.ts` checks this with a sentinel value. Start via 1Password `op run`, see readme "Token ueber 1Password".

- User obtains token from: Things → Settings → General → Enable Things URLs → Manage

## MCP Tools Catalog

All tools return `{ content: [{ type: "text", text: "..." }] }` format.

**Simple creation**:
- `add-todo`: Single/multiple todos with basic scheduling
- `add-project`: Project with optional nested todo titles

**Structured creation** (uses JSON format):
- `create-structured-project`: Build projects with real headings, nested todos, checklist items
- `restructure-project`: Reorder/create/delete headings and move todos in batch

**Updates** (require auth token):
- `update`: Modify existing todo
- `update-project`: Modify existing project

**Navigation/Search**:
- `show`: Navigate to specific item or list by ID/name
- `search`: Search across Things data

**Advanced**:
- `json`: Direct JSON batch operations (create/update multiple items)
- `evaluate`: Query Things item properties via JXA script (returns structured JSON)
- `version`: Get Things app version

**Read** (return data, read-only, `src/read.ts` + `scripts/things-read.jxa`):
- `list-todos`: built-in list (inbox, today, upcoming, anytime, someday, logbook)
- `todos-by-tag`, `todos-by-project`, `todos-by-area`: open todos by tag, project, area
- `search-todos`: open todos whose title or notes contain a text

The JXA script addresses lists by fixed ids (`TMTodayListSource`, ...) because list names are localized. It fetches all ids in one Apple Event, then `properties()` per todo up to `limit`; bulk per-field queries take seconds per field on the logbook. Dates are local `YYYY-MM-DD` (the old `evaluate` uses `toISOString()`, which shifts local midnight to the previous day in UTC).

## Coding Guidelines (from .cursorrules)

When modifying this codebase:

1. **TypeScript**: Use strict types, prefer Zod schemas for validation, use async/await
2. **MCP patterns**: All tool parameters must have Zod schemas with descriptions
3. **Things URL scheme**:
   - Always use `things:///` protocol
   - Use `URLSearchParams` for encoding
   - Support optional parameters (check for undefined)
   - Follow [Things URL scheme docs](https://culturedcode.com/things/support/articles/2803573/)
4. **Error handling**: Wrap `execAsync` calls in try/catch, provide clear error messages
5. **Parameter naming**: Use kebab-case for URL parameters (e.g., `"auth-token"`, `"list-id"`)

## Things Item IDs

To get item IDs for updates/queries:
- **macOS**: Control-click item → Share → Copy Link
- **iOS**: Tap item → toolbar → Share → Copy Link

IDs are embedded in `things:///show?id=<ID>` format.

## Common Pitfalls

1. **Auth token errors**: Update operations fail without auth token. Set `THINGS_AUTH_TOKEN` in the server environment (via `op run`); there is no `auth-token` parameter.
2. **JXA script missing**: Server will exit with error at startup if `scripts/things-evaluate-url.jxa` or `scripts/things-read.jxa` is not found.
3. **Wrong build output**: The server expects `dist/index.js` to exist. Always run `pnpm build` before testing.
4. **Special characters in titles/notes**: Always rely on `URLSearchParams` encoding, never manual string concatenation.
5. **Linting errors**: Run `pnpm lint:fix` to automatically fix most linting issues before committing.

## Testing

Tests are located in `test/` directory and use Vitest. `pnpm test` runs `tsc` first, because `test/server.test.ts` starts `dist/index.js`.

- `test/urls.test.ts`, `test/payloads.test.ts`: the real builders from `src/`
- `test/things-url.test.ts`: `%20` encoding
- `test/read.test.ts`: `readTodos` with a fake osascript (one JSON argument, error mapping), JXA self test without Things, read tool validation
- `test/when.test.ts`: accepted and rejected `when` values, rejected before anything is opened
- `test/token.test.ts`: no `auth-token` parameter, token in no response, error or process argument (stub `osascript` records stdin)
- `test/server.test.ts`: end to end over stdio against `dist/index.js`; a stub `open` in `PATH` records the URLs instead of opening Things (`test/helpers/server-harness.ts`)
- `test/url-construction.test.ts`: legacy, only exercises `URLSearchParams` itself

Against real Things: `scripts/probe-things.sh` creates a todo through `dist/index.js`, reads it back via AppleScript, compares title and notes, checks both opener routes against `ps -p <pid>`, reads the todos back through all five read tools, runs `update` with the real token when `THINGS_AUTH_TOKEN` is set (start it under `op run`, see readme), and deletes everything it created.

## Project Structure

```
things-mcp/
├── src/
│   ├── index.ts                 # Server, CLI flags, startup validation
│   ├── tools/                   # One module per MCP tool, tools/index.ts registers all
│   ├── paths.ts                 # JXA script paths, osascript binary
│   ├── read.ts                  # readTodos via things-read.jxa
│   ├── when.ts                  # when validation (YYYY-MM-DD etc.)
│   ├── schemas.ts               # Zod schemas
│   ├── urls.ts                  # Pure things:/// URL builders
│   ├── payloads.ts              # JSON payloads for things:///json
│   ├── things-url.ts            # thingsQuery (%20 encoding)
│   ├── opener.ts                # openThingsURL (open, or osascript via stdin for token URLs)
│   └── auth.ts                  # THINGS_AUTH_TOKEN only
├── test/                        # Vitest, see Testing
├── scripts/
│   ├── things-evaluate-url.jxa  # JXA script for evaluate tool
│   ├── things-read.jxa          # JXA script for the read tools
│   └── probe-things.sh          # Probe against real Things
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI pipeline
├── dist/                        # TypeScript build output (gitignored)
├── package.json                 # pnpm package with scripts and dependencies
├── tsconfig.json                # TypeScript config (ES2020, ESNext modules)
├── vitest.config.ts             # Vitest test configuration
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── readme.md                    # User-facing documentation
└── .cursorrules                 # Cursor AI coding guidelines
```

## CI/CD

GitHub Actions CI runs on every push and PR:

- Tests on Node.js 18, 20, and 22
- Runs on macOS (required for Things-specific features)
- Linting with ESLint
- Type checking with TypeScript
- Tests with Vitest
- Format checking with Prettier
- Build verification
