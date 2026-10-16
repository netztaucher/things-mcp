import { spawn } from "child_process";

// Oeffnet things:///-URLs. Eine URL ohne Token geht wie bisher als Argument an
// `open`. Eine URL mit auth-token wuerde so in der Prozessliste stehen
// (ps, sysctl KERN_PROCARGS2, Endpoint-Security-Protokolle). Deshalb geht sie
// per stdin an osascript, das sie ueber NSWorkspace oeffnet. Das Token steht
// dann in keinem Prozessargument.

export interface OpenerCommand {
  command: string;
  args: string[];
  stdin?: string;
}

const OPEN_FROM_STDIN_JXA = [
  'ObjC.import("AppKit");',
  "const data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;",
  "const text = $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding).js.trim();",
  "const url = $.NSURL.URLWithString(text);",
  'if (!url || url.isNil()) { throw new Error("invalid url"); }',
  'if (!$.NSWorkspace.sharedWorkspace.openURL(url)) { throw new Error("openURL failed"); }',
].join("\n");

export function containsAuthToken(url: string): boolean {
  const query = url.split("?")[1] ?? "";
  return new URLSearchParams(query).has("auth-token");
}

export function openerCommand(url: string): OpenerCommand {
  if (containsAuthToken(url)) {
    return {
      command: "osascript",
      args: ["-l", "JavaScript", "-e", OPEN_FROM_STDIN_JXA],
      stdin: url,
    };
  }
  return { command: "open", args: [url] };
}

// Fehlermeldungen nennen nie die URL, sie kann das Token tragen.
export async function openThingsURL(url: string): Promise<void> {
  const { command, args, stdin } = openerCommand(url);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [stdin === undefined ? "ignore" : "pipe", "ignore", "ignore"],
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to open Things URL: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to open Things URL: process exited with code ${code}`));
      }
    });

    if (stdin !== undefined && child.stdin) {
      child.stdin.on("error", () => {
        // Schliesst der Kindprozess stdin frueh, meldet close den Exit-Code.
      });
      child.stdin.end(stdin);
    }
  });
}
