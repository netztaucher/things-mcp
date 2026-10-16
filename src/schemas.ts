import { z } from "zod";
import { WHEN_DESCRIPTION, whenSchema } from "./when.js";

// Zod-Schemas der Werkzeuge. Die *Shape-Objekte gehen unveraendert an
// server.tool(), die Typen daraus an die URL-Bauer in urls.ts.

export const ChecklistItemSchema = z.union([
  z.string(),
  z.object({
    title: z.string(),
    completed: z.boolean().optional(),
  }),
]);

export type ChecklistItemInput = z.infer<typeof ChecklistItemSchema>;

export const StructuredTodoSchema = z.object({
  type: z.literal("to-do"),
  title: z.string(),
  notes: z.string().optional(),
  when: whenSchema.optional(),
  deadline: z.string().optional(),
  checklistItems: z.array(ChecklistItemSchema).optional(),
  tags: z.array(z.string()).optional(),
  canceled: z.boolean().optional(),
  completed: z.boolean().optional(),
  area: z.string().optional(),
  "area-id": z.string().optional(),
  "heading-id": z.string().optional(),
  "list-id": z.string().optional(),
  index: z.number().int().nonnegative().optional(),
});

export type StructuredTodoInput = z.infer<typeof StructuredTodoSchema>;

export const StructuredHeadingSchema = z.object({
  type: z.literal("heading"),
  title: z.string(),
  notes: z.string().optional(),
  index: z.number().int().nonnegative().optional(),
  items: z.array(StructuredTodoSchema).optional(),
});

export const StructuredProjectItemSchema = z.union([StructuredHeadingSchema, StructuredTodoSchema]);

export type StructuredProjectItemInput = z.infer<typeof StructuredProjectItemSchema>;

export const StructuredProjectSchema = z.object({
  title: z.string(),
  notes: z.string().optional(),
  when: whenSchema.optional(),
  deadline: z.string().optional(),
  tags: z.array(z.string()).optional(),
  area: z.string().optional(),
  "area-id": z.string().optional(),
  canceled: z.boolean().optional(),
  completed: z.boolean().optional(),
  index: z.number().int().nonnegative().optional(),
  items: z.array(StructuredProjectItemSchema).optional(),
});

export type StructuredProjectInput = z.infer<typeof StructuredProjectSchema>;

export const RestructureHeadingSchema = z.object({
  type: z.literal("heading"),
  id: z.string().optional(),
  title: z.string().optional(),
  operation: z.enum(["create", "update", "move", "delete"]).optional(),
  index: z.number().int().nonnegative().optional(),
  items: z.array(z.string()).optional(),
});

export const RestructureUnsectionedSchema = z.object({
  type: z.literal("unsectioned"),
  items: z.array(z.string()).optional(),
});

export const RestructureLayoutItemSchema = z.union([
  RestructureHeadingSchema,
  RestructureUnsectionedSchema,
]);

export type RestructureLayoutItemInput = z.infer<typeof RestructureLayoutItemSchema>;

export const addTodoShape = {
  title: z.string().optional().describe("The title of the todo (ignored if titles is specified)"),
  titles: z.string().optional().describe("Multiple todo titles separated by new lines"),
  notes: z.string().optional().describe("Notes for the todo (max 10,000 chars)"),
  when: whenSchema.optional().describe(WHEN_DESCRIPTION),
  deadline: z.string().optional().describe("Deadline date (YYYY-MM-DD format or natural language)"),
  tags: z.array(z.string()).optional().describe("Array of tag names"),
  "checklist-items": z.array(z.string()).optional().describe("Checklist items to add (max 100)"),
  "use-clipboard": z
    .enum(["replace-title", "replace-notes", "replace-checklist-items"])
    .optional()
    .describe("Use clipboard content"),
  "list-id": z
    .string()
    .optional()
    .describe("ID of project or area to add to (takes precedence over list)"),
  list: z.string().optional().describe("Title of project or area to add to"),
  "heading-id": z
    .string()
    .optional()
    .describe("ID of heading within project (takes precedence over heading)"),
  heading: z.string().optional().describe("Title of heading within project"),
  completed: z.boolean().optional().describe("Mark as completed"),
  canceled: z.boolean().optional().describe("Mark as canceled (takes priority over completed)"),
  "show-quick-entry": z.boolean().optional().describe("Show quick entry dialog instead of adding"),
  reveal: z.boolean().optional().describe("Navigate to and show the created todo"),
  "creation-date": z.string().optional().describe("ISO8601 date time string for creation date"),
  "completion-date": z.string().optional().describe("ISO8601 date time string for completion date"),
};

export type AddTodoParams = z.infer<z.ZodObject<typeof addTodoShape>>;

export const addProjectShape = {
  title: z.string().describe("The title of the project"),
  notes: z.string().optional().describe("Notes for the project (max 10,000 chars)"),
  when: whenSchema.optional().describe(WHEN_DESCRIPTION),
  deadline: z.string().optional().describe("Deadline date (YYYY-MM-DD format or natural language)"),
  tags: z.array(z.string()).optional().describe("Array of tag names"),
  "area-id": z.string().optional().describe("ID of area to add to (takes precedence over area)"),
  area: z.string().optional().describe("Title of area to add to"),
  "to-dos": z
    .array(z.string())
    .optional()
    .describe("Array of todo titles to create in the project"),
  completed: z.boolean().optional().describe("Mark as completed"),
  canceled: z.boolean().optional().describe("Mark as canceled (takes priority over completed)"),
  reveal: z.boolean().optional().describe("Navigate into the created project"),
  "creation-date": z.string().optional().describe("ISO8601 date time string for creation date"),
  "completion-date": z.string().optional().describe("ISO8601 date time string for completion date"),
};

export type AddProjectParams = z.infer<z.ZodObject<typeof addProjectShape>>;

export const createStructuredProjectShape = {
  project: StructuredProjectSchema.describe(
    "Structured project definition with headings and todos"
  ),
  reveal: z.boolean().optional().describe("Navigate to the created project when finished"),
};

export const updateShape = {
  id: z.string().describe("The ID of the todo to update (required)"),
  title: z.string().optional().describe("New title (replaces existing)"),
  notes: z.string().optional().describe("New notes (replaces existing, max 10,000 chars)"),
  "prepend-notes": z.string().optional().describe("Text to add before existing notes"),
  "append-notes": z.string().optional().describe("Text to add after existing notes"),
  when: whenSchema.optional().describe(`${WHEN_DESCRIPTION}. Cannot update repeating todos`),
  deadline: z.string().optional().describe("Deadline date (cannot update repeating todos)"),
  tags: z.array(z.string()).optional().describe("Replace all current tags"),
  "add-tags": z.array(z.string()).optional().describe("Add these tags to existing ones"),
  "checklist-items": z
    .array(z.string())
    .optional()
    .describe("Replace all checklist items (max 100)"),
  "prepend-checklist-items": z
    .array(z.string())
    .optional()
    .describe("Add checklist items to front"),
  "append-checklist-items": z.array(z.string()).optional().describe("Add checklist items to end"),
  "list-id": z.string().optional().describe("ID of project/area to move to"),
  list: z.string().optional().describe("Title of project/area to move to"),
  "heading-id": z.string().optional().describe("ID of heading to move to"),
  heading: z.string().optional().describe("Title of heading to move to"),
  completed: z.boolean().optional().describe("Mark as completed/incomplete"),
  canceled: z.boolean().optional().describe("Mark as canceled/incomplete"),
  reveal: z.boolean().optional().describe("Navigate to and show the updated todo"),
  duplicate: z.boolean().optional().describe("Duplicate before updating"),
  "creation-date": z.string().optional().describe("ISO8601 date time string for creation date"),
  "completion-date": z.string().optional().describe("ISO8601 date time string for completion date"),
};

export type UpdateParams = z.infer<z.ZodObject<typeof updateShape>>;

export const updateProjectShape = {
  id: z.string().describe("The ID of the project to update (required)"),
  title: z.string().optional().describe("New title (replaces existing)"),
  notes: z.string().optional().describe("New notes (replaces existing, max 10,000 chars)"),
  "prepend-notes": z.string().optional().describe("Text to add before existing notes"),
  "append-notes": z.string().optional().describe("Text to add after existing notes"),
  when: whenSchema.optional().describe(`${WHEN_DESCRIPTION}. Cannot update repeating projects`),
  deadline: z.string().optional().describe("Deadline date (cannot update repeating projects)"),
  tags: z.array(z.string()).optional().describe("Replace all current tags"),
  "add-tags": z.array(z.string()).optional().describe("Add these tags to existing ones"),
  "area-id": z.string().optional().describe("ID of area to move to"),
  area: z.string().optional().describe("Title of area to move to"),
  completed: z.boolean().optional().describe("Mark as completed/incomplete"),
  canceled: z.boolean().optional().describe("Mark as canceled/incomplete"),
  reveal: z.boolean().optional().describe("Navigate to and show the updated project"),
  duplicate: z.boolean().optional().describe("Duplicate before updating"),
  "creation-date": z.string().optional().describe("ISO8601 date time string for creation date"),
  "completion-date": z.string().optional().describe("ISO8601 date time string for completion date"),
};

export type UpdateProjectParams = z.infer<z.ZodObject<typeof updateProjectShape>>;

export const restructureProjectShape = {
  "project-id": z
    .string()
    .describe("Identifier of the project to restructure (from Share → Copy Link)"),
  layout: z
    .array(
      RestructureLayoutItemSchema.describe("Ordered layout blocks (headings or unsectioned items)")
    )
    .min(1)
    .describe("Top-to-bottom layout describing headings and todos in desired order"),
};

export const showShape = {
  id: z
    .string()
    .optional()
    .describe(
      "ID of area, project, tag, todo, or built-in list (inbox, today, anytime, upcoming, someday, logbook, tomorrow, deadlines, repeating, all-projects, logged-projects)"
    ),
  query: z.string().optional().describe("Name of area, project, tag, or built-in list to show"),
  filter: z.array(z.string()).optional().describe("Filter by tag names"),
};

export type ShowParams = z.infer<z.ZodObject<typeof showShape>>;

export const searchShape = {
  query: z.string().optional().describe("Search query"),
};

export const searchToolSchema = z.object(searchShape);

export const evaluateShape = {
  id: z.string().optional().describe("Things object id (from Share → Copy Link)"),
  url: z.string().optional().describe("Full Things URL such as things:///show?id=<ID>"),
};

export const evaluateSchema = z.object(evaluateShape).refine(
  (value) => {
    const hasId = Boolean(value.id);
    const hasUrl = Boolean(value.url);
    return (hasId || hasUrl) && !(hasId && hasUrl);
  },
  {
    message: "Provide either id or url, but not both",
  }
);

export const jsonShape = {
  data: z.string().describe("JSON string containing array of todo and project objects"),
  reveal: z.boolean().optional().describe("Navigate to and show the first created item"),
};
