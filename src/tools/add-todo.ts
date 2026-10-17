import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { addTodoShape } from "../schemas.js";
import { buildAddTodoUrl } from "../urls.js";

export function registerAddTodo(server: McpServer): void {
  server.tool("add-todo", addTodoShape, async (params) => {
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
  });
}
