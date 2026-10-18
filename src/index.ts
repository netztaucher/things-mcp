#!/usr/bin/env node
// Einstieg des MCP-Servers: registriert die Werkzeuge, wertet CLI-Flags aus,
// prueft beim Start JXA-Skripte und osascript und verbindet ueber stdio.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync } from "fs";
import { evaluateBinary, evaluateScriptPath, readScriptPath } from "./paths.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
  name: "things-mcp",
  version: "0.1.0",
});

registerTools(server);

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

// Validate JXA scripts exist at startup
for (const script of [evaluateScriptPath, readScriptPath]) {
  if (!existsSync(script)) {
    console.error(`ERROR: JXA script not found at: ${script}`);
    console.error("Make sure the scripts/ directory sits next to dist/ and is readable.");
    process.exit(1);
  }
}

// Validate osascript binary exists
if (!existsSync(evaluateBinary)) {
  console.error(`ERROR: osascript binary not found at: ${evaluateBinary}`);
  console.error("This server requires macOS to function.");
  process.exit(1);
}

const transport = new StdioServerTransport();
await server.connect(transport);
