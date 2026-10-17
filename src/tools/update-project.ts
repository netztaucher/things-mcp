import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { updateProjectShape } from "../schemas.js";
import { buildUpdateProjectUrl } from "../urls.js";

export function registerUpdateProject(server: McpServer): void {
  server.tool("update-project", updateProjectShape, async (params) => {
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
  });
}
