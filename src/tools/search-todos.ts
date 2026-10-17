import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readResultContent, readTodos } from "../read.js";
import { searchTodosShape } from "../schemas.js";

export function registerSearchTodos(server: McpServer): void {
  server.tool(
    "search-todos",
    "Find open todos whose title or notes contain the text and return their data (read-only). The search tool only opens the Things UI.",
    searchTodosShape,
    async (params) =>
      readResultContent(
        await readTodos({ source: "search", query: params.query, limit: params.limit ?? 50 })
      )
  );
}
