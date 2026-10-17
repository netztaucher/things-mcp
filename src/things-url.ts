// Things erwartet Leerzeichen als %20. URLSearchParams kodiert sie als "+",
// und Things uebernimmt das "+" woertlich in Titel und Notiz
// (jimfilippou/things-mcp#4, Fix aus #2).
export function thingsQuery(params: URLSearchParams): string {
  return params.toString().replace(/\+/g, "%20");
}
