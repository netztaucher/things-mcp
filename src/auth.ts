// Das Things-URL-Token kommt nur aus der Umgebung (THINGS_AUTH_TOKEN), nie als
// Werkzeug-Parameter. So steht es weder im Modell-Kontext noch in Protokollen
// des MCP-Clients. Meldungen nennen nur den Variablennamen, nie den Wert.

type Env = Record<string, string | undefined>;

export const AUTH_TOKEN_MISSING =
  "THINGS_AUTH_TOKEN is not set. Start the server with the token in its environment, e.g. via `op run` (see readme).";

export function optionalAuthToken(env: Env = process.env): string | undefined {
  const token = env.THINGS_AUTH_TOKEN;
  return token && token.trim().length > 0 ? token : undefined;
}

export function requireAuthToken(env: Env = process.env): string {
  const token = optionalAuthToken(env);
  if (!token) {
    throw new Error(AUTH_TOKEN_MISSING);
  }
  return token;
}
