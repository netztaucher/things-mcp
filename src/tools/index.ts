import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAddTodo } from "./add-todo.js";
import { registerAddProject } from "./add-project.js";
import { registerCreateStructuredProject } from "./create-structured-project.js";
import { registerUpdate } from "./update.js";
import { registerUpdateProject } from "./update-project.js";
import { registerRestructureProject } from "./restructure-project.js";
import { registerShow } from "./show.js";
import { registerSearch } from "./search.js";
import { registerEvaluate } from "./evaluate.js";
import { registerVersion } from "./version.js";
import { registerJson } from "./json.js";

// Reihenfolge wie bisher, sie bestimmt die Reihenfolge in tools/list.
export function registerTools(server: McpServer): void {
  registerAddTodo(server);
  registerAddProject(server);
  registerCreateStructuredProject(server);
  registerUpdate(server);
  registerUpdateProject(server);
  registerRestructureProject(server);
  registerShow(server);
  registerSearch(server);
  registerEvaluate(server);
  registerVersion(server);
  registerJson(server);
}
