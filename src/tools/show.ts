import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { showShape } from "../schemas.js";
import { buildShowUrl } from "../urls.js";

export function registerShow(server: McpServer): void {
  server.tool("show", showShape, async (params) => {
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
  });
}
