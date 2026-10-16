import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { optionalAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { buildStructuredProjectPayload } from "../payloads.js";
import { createStructuredProjectShape } from "../schemas.js";
import { buildJsonUrl } from "../urls.js";

export function registerCreateStructuredProject(server: McpServer): void {
  server.tool("create-structured-project", createStructuredProjectShape, async (params) => {
    const payload = buildStructuredProjectPayload(params.project);
    const authToken = optionalAuthToken();
    await openThingsURL(
      buildJsonUrl(JSON.stringify(payload), { authToken, reveal: params.reveal })
    );

    return {
      content: [
        {
          type: "text",
          text: `Structured project "${params.project.title}" created successfully in Things`,
        },
      ],
    };
  });
}
