// Werkzeug list-todos: liest Todos aus einer eingebauten Things-Liste.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readResultContent, readTodos } from "../read.js";
import { listTodosShape } from "../schemas.js";

export function registerListTodos(server: McpServer): void {
  server.tool(
    "list-todos",
    "Read todos from a built-in Things list (read-only). Returns JSON with id, name, notes, status, activation_date, due_date, tags, project, area.",
    listTodosShape,
    async (params) => {
      const limit = params.limit ?? (params.list === "logbook" ? 20 : 50);
      return readResultContent(await readTodos({ source: "list", list: params.list, limit }));
    }
  );
}
