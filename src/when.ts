import { z } from "zod";

// `when` fuer Things: Stichwort (today, tomorrow, evening, anytime, someday),
// festes Datum YYYY-MM-DD, Datum mit Erinnerung YYYY-MM-DD@HH:MM oder
// englischer Freitext ("in 3 days", "next tuesday"). Things nimmt das alles
// direkt aus der URL. Geprueft wird nur, was wie ein Datum aussieht: ein
// ungueltiger Kalendertag oder 01.11.2026 ginge sonst still an Things.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:@(\d{1,2}):(\d{2}))?$/;
const LOOKS_LIKE_DATE = /^\d{4}-|^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/;

export const WHEN_DESCRIPTION =
  "When to schedule: today, tomorrow, evening, anytime, someday, a fixed date YYYY-MM-DD, a date with reminder YYYY-MM-DD@HH:MM, or English natural language like 'in 3 days'";

export function whenProblem(value: string): string | undefined {
  const text = value.trim();
  if (text === "" || !LOOKS_LIKE_DATE.test(text)) {
    return undefined;
  }

  const match = ISO_DATE.exec(text);
  if (!match) {
    return `Invalid date "${value}" for when: use YYYY-MM-DD or YYYY-MM-DD@HH:MM`;
  }

  const [, y, m, d, hh, mm] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return `Invalid date "${value}" for when: no such calendar day`;
  }

  if (hh !== undefined && (Number(hh) > 23 || Number(mm) > 59)) {
    return `Invalid time in "${value}" for when: use HH:MM between 00:00 and 23:59`;
  }

  return undefined;
}

export const whenSchema = z.string().superRefine((value, ctx) => {
  const problem = whenProblem(value);
  if (problem) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
  }
});
