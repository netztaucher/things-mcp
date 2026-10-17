import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openThingsURL } from "../opener.js";
import { searchShape, searchToolSchema } from "../schemas.js";
import { buildSearchUrl } from "../urls.js";

export function registerSearch(server: McpServer): void {
  server.tool("search", searchShape, async (rawParams) => {
    const parsed = searchToolSchema.safeParse(rawParams);
    if (!parsed.success) {
      throw new Error(parsed.error.errors.map((issue) => issue.message).join(", "));
    }

    const params = parsed.data;
    await openThingsURL(buildSearchUrl(params.query));

    return {
      content: [
        {
          type: "text" as const,
          text: params.query
            ? `Searching for "${params.query}" in Things`
            : "Opened search in Things",
        },
      ],
    };
  });
}
