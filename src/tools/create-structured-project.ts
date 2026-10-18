// Werkzeug create-structured-project: legt ein Projekt mit Ueberschriften,
// Todos und Checklisten in einem things:///json-Aufruf an.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { optionalAuthToken } from "../auth.js";
import { openThingsURL } from "../opener.js";
import { buildStructuredProjectPayload } from "../payloads.js";
import { createStructuredProjectShape } from "../schemas.js";
import { buildJsonUrl } from "../urls.js";

export function registerCreateStructuredProject(server: McpServer): void {
  server.tool(
    "create-structured-project",
    "Create a project with real headings, nested todos and checklist items in one things:///json call (writes); when on project and todos takes today|tomorrow|evening|anytime|someday|YYYY-MM-DD|YYYY-MM-DD@HH:MM or English text like 'in 3 days'. Sends THINGS_AUTH_TOKEN if it is set, Things needs it only for update operations. The Things URL API returns no result, so confirm with todos-by-project.",
    createStructuredProjectShape,
    async (params) => {
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
    }
  );
}
