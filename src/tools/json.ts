// Werkzeug json: gibt beliebige Things-JSON-Befehle an things:///json weiter.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { optionalAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { jsonShape } from "../schemas.js";
import { buildJsonUrl } from "../urls.js";

export function registerJson(server: McpServer): void {
  server.tool(
    "json",
    "Send raw Things JSON commands (a JSON string with an array of to-do and project objects, including update operations) to things:///json (writes). Sends THINGS_AUTH_TOKEN if it is set, Things needs it for update operations; the JSON goes to Things unchecked. The Things URL API returns no result, so confirm with a read tool.",
    jsonShape,
    async (params) => {
      const authToken = optionalAuthToken();
      await openThingsURL(buildJsonUrl(params.data, { authToken, reveal: params.reveal }));

      return {
        content: [
          {
            type: "text",
            text: "JSON data processed successfully in Things",
          },
        ],
      };
    }
  );
}
