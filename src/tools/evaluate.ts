import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { evaluateBinary, evaluateScriptPath } from "../paths.js";
import { evaluateSchema, evaluateShape } from "../schemas.js";

const execFileAsync = promisify(execFile);

export function registerEvaluate(server: McpServer): void {
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
}
