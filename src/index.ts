#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import {
  addProjectShape,
  addTodoShape,
  createStructuredProjectShape,
  evaluateSchema,
  evaluateShape,
  jsonShape,
  restructureProjectShape,
  searchShape,
  searchToolSchema,
  showShape,
  updateProjectShape,
  updateShape,
} from "./schemas.js";
import { optionalAuthToken, requireAuthToken } from "./auth.js";
import { openThingsURL } from "./opener.js";
import { buildRestructurePayload, buildStructuredProjectPayload } from "./payloads.js";
import {
  buildAddProjectUrl,
  buildAddTodoUrl,
  buildJsonUrl,
  buildSearchUrl,
  buildShowUrl,
  buildUpdateProjectUrl,
  buildUpdateUrl,
} from "./urls.js";

const execFileAsync = promisify(execFile);

const server = new McpServer({
  name: "things-mcp",
  version: "0.1.0",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evaluateScriptPath = path.resolve(__dirname, "../scripts/things-evaluate-url.jxa");
const evaluateBinary = "/usr/bin/osascript";

server.tool("add-todo", addTodoShape, async (params) => {
  await openThingsURL(buildAddTodoUrl(params));

  const todoName = params.titles ? "todos" : `todo "${params.title || "untitled"}"`;
  return {
    content: [
      {
        type: "text",
        text: `${todoName} created successfully in Things`,
      },
    ],
  };
});

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

server.tool("create-structured-project", createStructuredProjectShape, async (params) => {
  const payload = buildStructuredProjectPayload(params.project);
  const authToken = optionalAuthToken();
  await openThingsURL(buildJsonUrl(JSON.stringify(payload), { authToken, reveal: params.reveal }));

  return {
    content: [
      {
        type: "text",
        text: `Structured project "${params.project.title}" created successfully in Things`,
      },
    ],
  };
});

server.tool("update", updateShape, async (params) => {
  const authToken = requireAuthToken();
  await openThingsURL(buildUpdateUrl(params, authToken));

  return {
    content: [
      {
        type: "text",
        text: `Todo updated successfully in Things`,
      },
    ],
  };
});

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

server.tool("evaluate", evaluateShape, async (rawParams) => {
  const parsedRequest = evaluateSchema.safeParse(rawParams);
  if (!parsedRequest.success) {
    throw new Error(parsedRequest.error.errors.map((issue) => issue.message).join(", "));
  }

  const params = parsedRequest.data;
  const target = params.id ?? params.url;
  if (!target) {
    throw new Error("Either id or url is required.");
  }

  try {
    // execFile statt exec: target geht als Argument, nicht durch eine Shell.
    // Mit exec wuerde $(...) in der doppelt gequoteten Zeichenkette ausgefuehrt.
    const { stdout } = await execFileAsync(evaluateBinary, [
      "-l",
      "JavaScript",
      evaluateScriptPath,
      target,
    ]);
    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error("No data returned from Things evaluate script.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (jsonError) {
      throw new Error(`Failed to parse Things evaluation result: ${String(jsonError)}`);
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
    ) {
      const errorPayload = parsed as Record<string, unknown>;
      const errorMessage =
        typeof errorPayload.message === "string"
          ? errorPayload.message
          : JSON.stringify(errorPayload);
      throw new Error(`Things evaluate script returned error: ${errorMessage}`);
    }

    return {
      content: [
        {
          type: "resource" as const,
          resource: {
            text: JSON.stringify(parsed, null, 2),
            uri: `things-evaluate://${encodeURIComponent(target ?? "")}`,
            mimeType: "application/json",
          },
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to evaluate Things item: ${error.message}`);
    }
    throw new Error("Failed to evaluate Things item due to unknown error.");
  }
});

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

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes("--version") || args.includes("-v")) {
  console.log("0.1.0");
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(
    `
Things MCP Server v0.1.0

A Model Context Protocol server for Things 3 app integration.

Usage:
  things-mcp              Start the MCP server
  things-mcp --version    Show version number
  things-mcp --help       Show this help message

Configuration:
  update, update-project and restructure-project need THINGS_AUTH_TOKEN in
  the environment. There is no auth-token tool parameter.

Documentation: https://github.com/kevinberny/things-mcp
  `.trim()
  );
  process.exit(0);
}

// Validate JXA script exists at startup
if (!existsSync(evaluateScriptPath)) {
  console.error(`ERROR: JXA script not found at: ${evaluateScriptPath}`);
  console.error("Make sure the scripts/things-evaluate-url.jxa file exists and is accessible.");
  process.exit(1);
}

// Validate osascript binary exists
if (!existsSync(evaluateBinary)) {
  console.error(`ERROR: osascript binary not found at: ${evaluateBinary}`);
  console.error("This server requires macOS to function.");
  process.exit(1);
}

const transport = new StdioServerTransport();
await server.connect(transport);
