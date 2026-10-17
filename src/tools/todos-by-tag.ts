import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readResultContent, readTodos } from "../read.js";
import { todosByTagShape } from "../schemas.js";

export function registerTodosByTag(server: McpServer): void {
  server.tool(
    "todos-by-tag",
    "Read open todos carrying a tag (read-only). Fails with tag_not_found if the tag does not exist.",
    todosByTagShape,
    async (params) =>
      readResultContent(
        await readTodos({ source: "tag", tag: params.tag, limit: params.limit ?? 50 })
      )
  );
}
