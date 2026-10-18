// Werkzeug todos-by-area: liest offene Todos eines Bereichs und seiner Projekte.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readResultContent, readTodos } from "../read.js";
import { requireIdOrName, todosByAreaShape } from "../schemas.js";

export function registerTodosByArea(server: McpServer): void {
  server.tool(
    "todos-by-area",
    "Read open todos of an area, by id or exact name, including its projects' todos unless include-projects is false (read-only).",
    todosByAreaShape,
    async (params) => {
      requireIdOrName(params);
      return readResultContent(
        await readTodos({
          source: "area",
          id: params.id,
          name: params.name,
          includeProjects: params["include-projects"] ?? true,
          limit: params.limit ?? 50,
        })
      );
    }
  );
}
