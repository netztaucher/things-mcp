import { thingsQuery } from "./things-url.js";
import type {
  AddProjectParams,
  AddTodoParams,
  ShowParams,
  UpdateParams,
  UpdateProjectParams,
} from "./schemas.js";

// Reine URL-Bauer: Parameter rein, things:///-URL raus. Kein Prozess, kein
// Things, deshalb direkt testbar (test/urls.test.ts).

export function buildAddTodoUrl(params: AddTodoParams): string {
  const urlParams = new URLSearchParams();

  // Handle title vs titles
  if (params.titles) {
    urlParams.set("titles", params.titles);
  } else if (params.title) {
    urlParams.set("title", params.title);
  }

  if (params.notes) urlParams.set("notes", params.notes);
  if (params.when) urlParams.set("when", params.when);
  if (params.deadline) urlParams.set("deadline", params.deadline);
  if (params.tags && params.tags.length > 0) urlParams.set("tags", params.tags.join(","));
  if (params["checklist-items"] && params["checklist-items"].length > 0) {
    urlParams.set("checklist-items", params["checklist-items"].join("\n"));
  }
  if (params["use-clipboard"]) urlParams.set("use-clipboard", params["use-clipboard"]);
  if (params["list-id"]) urlParams.set("list-id", params["list-id"]);
  if (params.list) urlParams.set("list", params.list);
  if (params["heading-id"]) urlParams.set("heading-id", params["heading-id"]);
  if (params.heading) urlParams.set("heading", params.heading);
  if (params.completed !== undefined) urlParams.set("completed", params.completed.toString());
  if (params.canceled !== undefined) urlParams.set("canceled", params.canceled.toString());
  if (params["show-quick-entry"] !== undefined)
    urlParams.set("show-quick-entry", params["show-quick-entry"].toString());
  if (params.reveal !== undefined) urlParams.set("reveal", params.reveal.toString());
  if (params["creation-date"]) urlParams.set("creation-date", params["creation-date"]);
  if (params["completion-date"]) urlParams.set("completion-date", params["completion-date"]);

  return `things:///add?${thingsQuery(urlParams)}`;
}

export function buildAddProjectUrl(params: AddProjectParams): string {
  const urlParams = new URLSearchParams();
  urlParams.set("title", params.title);

  if (params.notes) urlParams.set("notes", params.notes);
  if (params.when) urlParams.set("when", params.when);
  if (params.deadline) urlParams.set("deadline", params.deadline);
  if (params.tags && params.tags.length > 0) urlParams.set("tags", params.tags.join(","));
  if (params["area-id"]) urlParams.set("area-id", params["area-id"]);
  if (params.area) urlParams.set("area", params.area);
  if (params["to-dos"] && params["to-dos"].length > 0) {
    urlParams.set("to-dos", params["to-dos"].join("\n"));
  }
  if (params.completed !== undefined) urlParams.set("completed", params.completed.toString());
  if (params.canceled !== undefined) urlParams.set("canceled", params.canceled.toString());
  if (params.reveal !== undefined) urlParams.set("reveal", params.reveal.toString());
  if (params["creation-date"]) urlParams.set("creation-date", params["creation-date"]);
  if (params["completion-date"]) urlParams.set("completion-date", params["completion-date"]);

  return `things:///add-project?${thingsQuery(urlParams)}`;
}

export function buildUpdateUrl(params: UpdateParams, authToken: string): string {
  const urlParams = new URLSearchParams();
  urlParams.set("id", params.id);
  urlParams.set("auth-token", authToken);

  if (params.title) urlParams.set("title", params.title);
  if (params.notes !== undefined) urlParams.set("notes", params.notes);
  if (params["prepend-notes"]) urlParams.set("prepend-notes", params["prepend-notes"]);
  if (params["append-notes"]) urlParams.set("append-notes", params["append-notes"]);
  if (params.when !== undefined) urlParams.set("when", params.when);
  if (params.deadline !== undefined) urlParams.set("deadline", params.deadline);
  if (params.tags) urlParams.set("tags", params.tags.join(","));
  if (params["add-tags"]) urlParams.set("add-tags", params["add-tags"].join(","));
  if (params["checklist-items"])
    urlParams.set("checklist-items", params["checklist-items"].join("\n"));
  if (params["prepend-checklist-items"])
    urlParams.set("prepend-checklist-items", params["prepend-checklist-items"].join("\n"));
  if (params["append-checklist-items"])
    urlParams.set("append-checklist-items", params["append-checklist-items"].join("\n"));
  if (params["list-id"]) urlParams.set("list-id", params["list-id"]);
  if (params.list) urlParams.set("list", params.list);
  if (params["heading-id"]) urlParams.set("heading-id", params["heading-id"]);
  if (params.heading) urlParams.set("heading", params.heading);
  if (params.completed !== undefined) urlParams.set("completed", params.completed.toString());
  if (params.canceled !== undefined) urlParams.set("canceled", params.canceled.toString());
  if (params.reveal !== undefined) urlParams.set("reveal", params.reveal.toString());
  if (params.duplicate !== undefined) urlParams.set("duplicate", params.duplicate.toString());
  if (params["creation-date"]) urlParams.set("creation-date", params["creation-date"]);
  if (params["completion-date"]) urlParams.set("completion-date", params["completion-date"]);

  return `things:///update?${thingsQuery(urlParams)}`;
}

export function buildUpdateProjectUrl(params: UpdateProjectParams, authToken: string): string {
  const urlParams = new URLSearchParams();
  urlParams.set("id", params.id);
  urlParams.set("auth-token", authToken);

  if (params.title) urlParams.set("title", params.title);
  if (params.notes !== undefined) urlParams.set("notes", params.notes);
  if (params["prepend-notes"]) urlParams.set("prepend-notes", params["prepend-notes"]);
  if (params["append-notes"]) urlParams.set("append-notes", params["append-notes"]);
  if (params.when !== undefined) urlParams.set("when", params.when);
  if (params.deadline !== undefined) urlParams.set("deadline", params.deadline);
  if (params.tags) urlParams.set("tags", params.tags.join(","));
  if (params["add-tags"]) urlParams.set("add-tags", params["add-tags"].join(","));
  if (params["area-id"]) urlParams.set("area-id", params["area-id"]);
  if (params.area) urlParams.set("area", params.area);
  if (params.completed !== undefined) urlParams.set("completed", params.completed.toString());
  if (params.canceled !== undefined) urlParams.set("canceled", params.canceled.toString());
  if (params.reveal !== undefined) urlParams.set("reveal", params.reveal.toString());
  if (params.duplicate !== undefined) urlParams.set("duplicate", params.duplicate.toString());
  if (params["creation-date"]) urlParams.set("creation-date", params["creation-date"]);
  if (params["completion-date"]) urlParams.set("completion-date", params["completion-date"]);

  return `things:///update-project?${thingsQuery(urlParams)}`;
}

// things:///json fuer json, create-structured-project und restructure-project.
// data ist bereits ein JSON-String.
export function buildJsonUrl(
  data: string,
  options: { authToken?: string; reveal?: boolean } = {}
): string {
  const urlParams = new URLSearchParams();

  if (options.authToken) {
    urlParams.set("auth-token", options.authToken);
  }

  urlParams.set("data", data);

  if (options.reveal !== undefined) {
    urlParams.set("reveal", options.reveal.toString());
  }

  return `things:///json?${thingsQuery(urlParams)}`;
}

export function buildShowUrl(params: ShowParams): string {
  const urlParams = new URLSearchParams();

  if (params.id) {
    urlParams.set("id", params.id);
  } else if (params.query) {
    urlParams.set("query", params.query);
  }

  if (params.filter && params.filter.length > 0) {
    urlParams.set("filter", params.filter.join(","));
  }

  return `things:///show?${thingsQuery(urlParams)}`;
}

export function buildSearchUrl(query?: string): string {
  const urlParams = new URLSearchParams();
  if (query) urlParams.set("query", query);
  return `things:///search?${thingsQuery(urlParams)}`;
}
