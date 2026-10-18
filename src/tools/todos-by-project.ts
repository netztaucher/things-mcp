// Werkzeug todos-by-project: liest offene Todos eines Projekts.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readResultContent, readTodos } from "../read.js";
import { requireIdOrName, todosByProjectShape } from "../schemas.js";

export function registerTodosByProject(server: McpServer): void {
  server.tool(
    "todos-by-project",
    "Read open todos of a project, by id or exact name (read-only).",
    todosByProjectShape,
    async (params) => {
      requireIdOrName(params);
      return readResultContent(
        await readTodos({
          source: "project",
          id: params.id,
          name: params.name,
          limit: params.limit ?? 50,
        })
      );
    }
  );
}
