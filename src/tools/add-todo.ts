// Werkzeug add-todo: legt ein oder mehrere Todos ueber things:///add an.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { addTodoShape } from "../schemas.js";
import { buildAddTodoUrl } from "../urls.js";

export function registerAddTodo(server: McpServer): void {
  server.tool(
    "add-todo",
    "Create one or more todos in Things (writes, no token needed); use title, or titles with one todo per line. when takes today|tomorrow|evening|anytime|someday|YYYY-MM-DD|YYYY-MM-DD@HH:MM or English text like 'in 3 days', and tags must already exist in Things. The Things URL API returns no result, so confirm with a read tool such as list-todos or search-todos.",
    addTodoShape,
    async (params) => {
      await openThingsURL(buildAddTodoUrl(params));

      const todoName = params.titles ? "todos" : `todo "${params.title || "untitled"}"`;
      return {
        content: [
          {
            type: "text",
            text: `${todoName} created successfully in Things`,
          },
        ],
      };
    }
  );
}
