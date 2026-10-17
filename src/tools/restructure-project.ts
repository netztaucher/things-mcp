import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { buildRestructurePayload } from "../payloads.js";
import { restructureProjectShape } from "../schemas.js";
import { buildJsonUrl } from "../urls.js";

export function registerRestructureProject(server: McpServer): void {
  server.tool("restructure-project", restructureProjectShape, async (params) => {
    const { operations, createdHeadings } = buildRestructurePayload(
      params["project-id"],
      params.layout
    );

    if (operations.length === 0) {
      throw new Error(
        "No operations generated from layout. Verify that headings or items are provided."
      );
    }

    const authToken = requireAuthToken();
    await openThingsURL(buildJsonUrl(JSON.stringify(operations), { authToken }));

    const resultTextLines = [`Project ${params["project-id"]} restructured successfully in Things`];

    if (createdHeadings.length) {
      resultTextLines.push(
        "New headings:",
        ...createdHeadings.map((heading) => `• ${heading.title ?? "(untitled)"} → ${heading.id}`)
      );
    }

    return {
      content: [
        {
          type: "text",
          text: resultTextLines.join("\n"),
        },
      ],
    };
  });
}
