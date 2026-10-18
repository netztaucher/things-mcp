// Werkzeug update: aendert ein Todo ueber things:///update, braucht THINGS_AUTH_TOKEN.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { updateShape } from "../schemas.js";
import { buildUpdateUrl } from "../urls.js";

export function registerUpdate(server: McpServer): void {
  server.tool(
    "update",
    "Change an existing todo by id: title, notes (replace, prepend, append), when, deadline, tags, checklist, move to project/area/heading, complete, cancel or duplicate (writes). Requires THINGS_AUTH_TOKEN in the server environment, otherwise fails with 'THINGS_AUTH_TOKEN is not set'; when takes today|tomorrow|evening|anytime|someday|YYYY-MM-DD|YYYY-MM-DD@HH:MM or English text like 'in 3 days', when and deadline do not work on repeating todos. The Things URL API returns no result, so confirm with evaluate or a read tool.",
    updateShape,
    async (params) => {
      const authToken = requireAuthToken();
      await openThingsURL(buildUpdateUrl(params, authToken));

      return {
        content: [
          {
            type: "text",
            text: `Todo updated successfully in Things`,
          },
        ],
      };
    }
  );
}
