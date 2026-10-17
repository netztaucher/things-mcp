import path from "path";
import { fileURLToPath } from "url";

// Liegt direkt unter src/ bzw. dist/, deshalb fuehrt ../scripts aus dist/ zum Skript.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const evaluateScriptPath = path.resolve(__dirname, "../scripts/things-evaluate-url.jxa");
export const evaluateBinary = "/usr/bin/osascript";
