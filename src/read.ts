import { execFile } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { evaluateBinary, readScriptPath } from "./paths.js";

// Lesezugriff auf Things ueber scripts/things-read.jxa. Die Anfrage geht als
// ein JSON-Argument per execFile an osascript, nie durch eine Shell. Nur lesend.

const execFileAsync = promisify(execFile);

export const BUILT_IN_LISTS = [
  "inbox",
  "today",
  "upcoming",
  "anytime",
  "someday",
  "logbook",
] as const;

export type ReadRequest =
  | { source: "list"; list: (typeof BUILT_IN_LISTS)[number]; limit: number }
  | { source: "tag"; tag: string; limit: number }
  | { source: "project"; id?: string; name?: string; limit: number }
  | { source: "area"; id?: string; name?: string; includeProjects: boolean; limit: number }
  | { source: "search"; query: string; limit: number };

const RefSchema = z.object({ id: z.string(), name: z.string() }).nullable();

export const TodoSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string(),
  status: z.string(),
  activation_date: z.string().nullable(),
  due_date: z.string().nullable(),
  tags: z.array(z.string()),
  project: RefSchema,
  area: RefSchema,
  completion_date: z.string().optional(),
});

export const ReadResultSchema = z.object({
  source: z.string(),
  total: z.number(),
  returned: z.number(),
  truncated: z.boolean(),
  todos: z.array(TodoSchema),
});

export type ReadResult = z.infer<typeof ReadResultSchema>;

const ReadErrorSchema = z.object({ error: z.string(), message: z.string() });

export interface ReadRunner {
  binary: string;
  script: string;
  timeoutMs: number;
}

const defaultRunner: ReadRunner = {
  binary: evaluateBinary,
  script: readScriptPath,
  // Logbuch mit hohem Limit braucht einige Sekunden.
  timeoutMs: 120_000,
};

export class ThingsReadError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ThingsReadError";
  }
}

export async function readTodos(
  request: ReadRequest,
  runner: ReadRunner = defaultRunner
): Promise<ReadResult> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      runner.binary,
      ["-l", "JavaScript", runner.script, JSON.stringify(request)],
      { timeout: runner.timeoutMs, maxBuffer: 32 * 1024 * 1024 }
    ));
  } catch (error) {
    const reason = error instanceof Error ? error.message.split("\n")[0] : String(error);
    throw new ThingsReadError("osascript_failed", `Reading from Things failed: ${reason}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new ThingsReadError("bad_output", "Things read script returned no valid JSON");
  }

  const failure = ReadErrorSchema.safeParse(parsed);
  if (failure.success) {
    throw new ThingsReadError(
      failure.data.error,
      `${failure.data.message} (${failure.data.error})`
    );
  }

  const result = ReadResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new ThingsReadError("bad_output", "Things read script returned an unexpected shape");
  }
  return result.data;
}

export function readResultContent(result: ReadResult) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}
