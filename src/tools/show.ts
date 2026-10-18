// Werkzeug show: oeffnet eine Liste oder ein Element in der Things-Oberflaeche.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { showShape } from "../schemas.js";
import { buildShowUrl } from "../urls.js";

export function registerShow(server: McpServer): void {
  server.tool(
    "show",
    "Open an area, project, tag, todo or built-in list (today, inbox, upcoming, ...) in the Things window by id or query, optionally filtered by tags. Only opens the UI and returns no data; to read todos use list-todos, the todos-by-* tools or evaluate.",
    showShape,
    async (params) => {
      await openThingsURL(buildShowUrl(params));

      const target = params.id || params.query || "Things";
      return {
        content: [
          {
            type: "text",
            text: `Opened ${target} in Things`,
          },
        ],
      };
    }
  );
}
