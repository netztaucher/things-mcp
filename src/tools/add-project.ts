// Werkzeug add-project: legt ein Projekt mit Todo-Titeln ueber things:///add-project an.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { addProjectShape } from "../schemas.js";
import { buildAddProjectUrl } from "../urls.js";

export function registerAddProject(server: McpServer): void {
  server.tool(
    "add-project",
    "Create a project in Things with optional todo titles (to-dos), area, tags, when and deadline (writes, no token needed). when takes today|tomorrow|evening|anytime|someday|YYYY-MM-DD|YYYY-MM-DD@HH:MM or English text like 'in 3 days'. The Things URL API returns no result, so confirm with todos-by-project.",
    addProjectShape,
    async (params) => {
      await openThingsURL(buildAddProjectUrl(params));

      return {
        content: [
          {
            type: "text",
            text: `Project "${params.title}" created successfully in Things`,
          },
        ],
      };
    }
  );
}
