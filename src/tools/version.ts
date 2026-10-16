import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";

export function registerVersion(server: McpServer): void {
  server.tool("version", {}, async () => {
    await openThingsURL(`things:///version`);

    return {
      content: [
        {
          type: "text",
          text: "Retrieved Things version information",
        },
      ],
    };
  });
}
