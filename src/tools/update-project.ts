// Werkzeug update-project: aendert ein Projekt ueber things:///update-project,
// braucht THINGS_AUTH_TOKEN.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { updateProjectShape } from "../schemas.js";
import { buildUpdateProjectUrl } from "../urls.js";

export function registerUpdateProject(server: McpServer): void {
  server.tool(
    "update-project",
    "Change an existing project by id: title, notes (replace, prepend, append), when, deadline, tags, area, complete, cancel or duplicate (writes). Requires THINGS_AUTH_TOKEN in the server environment, otherwise fails with 'THINGS_AUTH_TOKEN is not set'; when takes today|tomorrow|evening|anytime|someday|YYYY-MM-DD|YYYY-MM-DD@HH:MM or English text like 'in 3 days', when and deadline do not work on repeating projects. The Things URL API returns no result, so confirm with evaluate or todos-by-project.",
    updateProjectShape,
    async (params) => {
      const authToken = requireAuthToken();
      await openThingsURL(buildUpdateProjectUrl(params, authToken));

      return {
        content: [
          {
            type: "text",
            text: `Project updated successfully in Things`,
          },
        ],
      };
    }
  );
}
