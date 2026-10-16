import { describe, it, expect } from "vitest";
import { buildRestructurePayload, buildStructuredProjectPayload } from "../src/payloads.js";

describe("buildStructuredProjectPayload", () => {
  it("baut Projekt mit Ueberschrift, Todo und Checkliste", () => {
    const payload = buildStructuredProjectPayload({
      title: "P",
      tags: ["a"],
      items: [
        {
          type: "heading",
          title: "H",
          items: [
            { type: "to-do", title: "T", checklistItems: ["c1", { title: "c2", completed: true }] },
          ],
        },
        { type: "to-do", title: "lose", when: "2026-11-01" },
      ],
    });

    expect(payload).toEqual([
      {
        type: "project",
        attributes: { title: "P", tags: ["a"] },
        items: [
          {
            type: "heading",
            attributes: { title: "H" },
            items: [
              {
                type: "to-do",
                attributes: { title: "T" },
                items: [
                  { type: "checklist-item", attributes: { title: "c1" } },
                  { type: "checklist-item", attributes: { title: "c2", completed: true } },
                ],
              },
            ],
          },
          { type: "to-do", attributes: { title: "lose", when: "2026-11-01" } },
        ],
      },
    ]);
  });
});

describe("buildRestructurePayload", () => {
  it("legt neue Ueberschriften an und verschiebt Todos in Reihenfolge", () => {
    const { operations, createdHeadings } = buildRestructurePayload("PRJ", [
      { type: "unsectioned", items: ["t1"] },
      { type: "heading", title: "Neu", items: ["t2", "t3"] },
      { type: "heading", id: "H-ALT", operation: "delete" },
    ]);

    expect(createdHeadings).toHaveLength(1);
    const neueId = createdHeadings[0].id;
    expect(operations).toEqual([
      {
        type: "heading",
        id: neueId,
        operation: "create",
        attributes: { "project-id": "PRJ", title: "Neu", index: 0 },
      },
      { type: "heading", id: "H-ALT", operation: "delete" },
      { type: "to-do", id: "t1", operation: "move", attributes: { "list-id": "PRJ", index: 0 } },
      {
        type: "to-do",
        id: "t2",
        operation: "move",
        attributes: { "list-id": "PRJ", "heading-id": neueId, index: 1 },
      },
      {
        type: "to-do",
        id: "t3",
        operation: "move",
        attributes: { "list-id": "PRJ", "heading-id": neueId, index: 2 },
      },
    ]);
  });

  it("nimmt fuer vorhandene Ueberschrift ohne Aenderung move", () => {
    const { operations } = buildRestructurePayload("PRJ", [{ type: "heading", id: "H1" }]);
    expect(operations[0]).toMatchObject({ id: "H1", operation: "move" });
  });
});
