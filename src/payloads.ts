import { randomUUID } from "crypto";
import type {
  ChecklistItemInput,
  RestructureLayoutItemInput,
  StructuredProjectInput,
  StructuredProjectItemInput,
  StructuredTodoInput,
} from "./schemas.js";

// JSON-Nutzlasten fuer things:///json (create-structured-project, restructure-project).

export function buildChecklistItems(items: ChecklistItemInput[] = []) {
  return items.map((item) => {
    if (typeof item === "string") {
      return {
        type: "checklist-item",
        attributes: {
          title: item,
        },
      };
    }

    return {
      type: "checklist-item",
      attributes: {
        title: item.title,
        ...(item.completed !== undefined && { completed: item.completed }),
      },
    };
  });
}

export function buildTodo(todo: StructuredTodoInput) {
  const attributes: Record<string, unknown> = {
    title: todo.title,
  };

  if (todo.notes) attributes.notes = todo.notes;
  if (todo.when) attributes.when = todo.when;
  if (todo.deadline) attributes.deadline = todo.deadline;
  if (todo.tags?.length) attributes.tags = todo.tags;
  if (todo.canceled !== undefined) attributes.canceled = todo.canceled;
  if (todo.completed !== undefined) attributes.completed = todo.completed;
  if (todo.area) attributes.area = todo.area;
  if (todo["area-id"]) attributes["area-id"] = todo["area-id"];
  if (todo["heading-id"]) attributes["heading-id"] = todo["heading-id"];
  if (todo["list-id"]) attributes["list-id"] = todo["list-id"];
  if (todo.index !== undefined) attributes.index = todo.index;

  const checklistItems =
    todo.checklistItems && todo.checklistItems.length
      ? buildChecklistItems(todo.checklistItems)
      : undefined;

  return {
    type: "to-do",
    attributes,
    ...(checklistItems && { items: checklistItems }),
  };
}

export function buildProjectItems(items: StructuredProjectItemInput[] = []) {
  return items.map((item) => {
    if (item.type === "heading") {
      const headingAttributes: Record<string, unknown> = {
        title: item.title,
      };
      if (item.notes) headingAttributes.notes = item.notes;
      if (item.index !== undefined) headingAttributes.index = item.index;

      return {
        type: "heading",
        attributes: headingAttributes,
        ...(item.items && item.items.length
          ? { items: item.items.map((todo) => buildTodo(todo)) }
          : {}),
      };
    }

    return buildTodo(item);
  });
}

export function buildStructuredProjectPayload(project: StructuredProjectInput) {
  const attributes: Record<string, unknown> = {
    title: project.title,
  };

  if (project.notes) attributes.notes = project.notes;
  if (project.when) attributes.when = project.when;
  if (project.deadline) attributes.deadline = project.deadline;
  if (project.tags?.length) attributes.tags = project.tags;
  if (project.area) attributes.area = project.area;
  if (project["area-id"]) attributes["area-id"] = project["area-id"];
  if (project.canceled !== undefined) attributes.canceled = project.canceled;
  if (project.completed !== undefined) attributes.completed = project.completed;
  if (project.index !== undefined) attributes.index = project.index;

  const payload: Record<string, unknown> = {
    type: "project",
    attributes,
  };

  if (project.items?.length) {
    payload.items = buildProjectItems(project.items);
  }

  return [payload];
}

export function buildRestructurePayload(projectId: string, layout: RestructureLayoutItemInput[]) {
  const headingOperations: Record<string, unknown>[] = [];
  const todoOperations: Record<string, unknown>[] = [];
  let headingIndex = 0;
  let todoIndex = 0;
  const createdHeadings: { id: string; title?: string }[] = [];

  layout.forEach((item) => {
    if (item.type === "heading") {
      const providedId = item.id;
      const generatedId = providedId ?? randomUUID();
      const operation =
        item.operation ||
        (providedId ? (item.title || item.index !== undefined ? "update" : "move") : "create");

      if (operation !== "delete") {
        const headingAttributes: Record<string, unknown> = {
          "project-id": projectId,
        };

        if (item.title) headingAttributes.title = item.title;
        headingAttributes.index = item.index !== undefined ? item.index : headingIndex;

        headingOperations.push({
          type: "heading",
          id: generatedId,
          operation,
          attributes: headingAttributes,
        });

        if (!providedId) {
          createdHeadings.push({
            id: generatedId,
            title: item.title,
          });
        }
      } else if (providedId) {
        headingOperations.push({
          type: "heading",
          id: providedId,
          operation: "delete",
        });
      }

      const targetHeadingId = operation === "delete" ? undefined : (providedId ?? generatedId);

      if (targetHeadingId && item.items?.length) {
        item.items.forEach((todoId) => {
          todoOperations.push({
            type: "to-do",
            id: todoId,
            operation: "move",
            attributes: {
              "list-id": projectId,
              "heading-id": targetHeadingId,
              index: todoIndex,
            },
          });
          todoIndex += 1;
        });
      }

      if (operation !== "delete") {
        headingIndex += 1;
      }
    } else if (item.type === "unsectioned" && item.items?.length) {
      item.items.forEach((todoId) => {
        todoOperations.push({
          type: "to-do",
          id: todoId,
          operation: "move",
          attributes: {
            "list-id": projectId,
            index: todoIndex,
          },
        });
        todoIndex += 1;
      });
    }
  });

  return {
    operations: [...headingOperations, ...todoOperations],
    createdHeadings,
  };
}
