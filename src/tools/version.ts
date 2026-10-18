// Werkzeug version: oeffnet things:///version.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";

export function registerVersion(server: McpServer): void {
  server.tool(
    "version",
    "Open things:///version in Things. Only triggers the app; no version number is returned to the caller.",
    {},
    async () => {
      await openThingsURL(`things:///version`);

      return {
        content: [
          {
            type: "text",
            text: "Retrieved Things version information",
          },
        ],
      };
    }
  );
}
