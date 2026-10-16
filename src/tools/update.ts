import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { updateShape } from "../schemas.js";
import { buildUpdateUrl } from "../urls.js";

export function registerUpdate(server: McpServer): void {
  server.tool("update", updateShape, async (params) => {
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
  });
}
