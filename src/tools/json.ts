import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { optionalAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { jsonShape } from "../schemas.js";
import { buildJsonUrl } from "../urls.js";

export function registerJson(server: McpServer): void {
  server.tool("json", jsonShape, async (params) => {
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
  });
}
