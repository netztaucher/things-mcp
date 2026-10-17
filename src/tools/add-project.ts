import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { addProjectShape } from "../schemas.js";
import { buildAddProjectUrl } from "../urls.js";

export function registerAddProject(server: McpServer): void {
  server.tool("add-project", addProjectShape, async (params) => {
    await openThingsURL(buildAddProjectUrl(params));

    return {
      content: [
        {
          type: "text",
          text: `Project "${params.title}" created successfully in Things`,
        },
      ],
    };
  });
}
