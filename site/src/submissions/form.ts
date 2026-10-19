// The submission form's fields and rules, shared by the endpoint and the form page.
import type { NewSubmission } from "./store.ts";

/** Field name → what to fix, in words a Student reads beside the field. */
export type FieldErrors = Partial<Record<string, string>>;

export type Validated = { ok: true; submission: NewSubmission } | { ok: false; errors: FieldErrors };

/** Longest value per text field (the form's `maxlength`); counted as the browser counts. */
export const MAX_LENGTH = {
  problem_text: 2000,
  answer: 2000,
  molecule: 200,
  display_name: 60,
  reply_email: 254,
  target_id: 100,
} as const;

const KINDS = ["problem", "mistake"];
/** A Unit id from the course map: u1, u2, ... */
const UNIT = /^u\d{1,3}$/;
/** A Problem id, or `<lesson id>#<step id>` for a Step (the Step-link form, ADR 0003). */
const TARGET = /^[a-z0-9][a-z0-9-]*(#[a-z0-9-]+)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What a Student reads after sending (spec story 81): a chemist checks first and it can take
 * weeks; then either one reply and the address is deleted, or no reply but a credit.
 */
export function confirmation(gaveEmail: boolean): string[] {
  return [
    "Thanks, it's in. A chemist checks every submission first, and that can take weeks.",
    gaveEmail
      ? "We'll reply at most once, then delete your address."
      : "You won't hear back, but accepted Problems show your credit: your display name, or \"a Student\".",
  ];
}

/** Checks the posted fields; trims text and turns empty optional fields into null. */
export function validate(get: (name: string) => string | null): Validated {
  const text = (name: string) => (get(name) ?? "").trim();
  const optional = (name: string) => text(name) || null;
  const errors: FieldErrors = {};
  const tooLong = (name: keyof typeof MAX_LENGTH) => text(name).length > MAX_LENGTH[name];

  const kind = text("kind");
  if (!KINDS.includes(kind)) errors.kind = "Choose Suggest a Problem or Report a mistake.";
  if (!UNIT.test(text("unit"))) errors.unit = "Choose a Unit.";
  if (kind === "mistake" && (!TARGET.test(text("target_id")) || tooLong("target_id")))
    errors.target_id = "Say which Step or Problem is wrong.";
  if (!text("problem_text")) errors.problem_text = "Write the Problem.";
  else if (tooLong("problem_text"))
    errors.problem_text = `Keep it to 2,000 characters (this is ${text("problem_text").length.toLocaleString("en-US")}).`;
  if (!text("answer")) errors.answer = "Give your answer and how you got it.";
  else if (tooLong("answer")) errors.answer = "Keep it to 2,000 characters.";
  if (tooLong("molecule")) errors.molecule = "Keep it to 200 characters.";
  if (tooLong("display_name")) errors.display_name = "Keep it to 60 characters.";
  if (text("reply_email") && (!EMAIL.test(text("reply_email")) || tooLong("reply_email")))
    errors.reply_email = "That doesn't look like an email address.";
  if (!get("consent")) errors.consent = "Tick the box to agree that an accepted Problem is published under CC BY-NC-SA 4.0.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    submission: {
      kind: kind as NewSubmission["kind"],
      unit: text("unit"),
      target_id: kind === "mistake" ? text("target_id") : null,
      problem_text: text("problem_text"),
      answer: text("answer"),
      molecule: optional("molecule"),
      display_name: optional("display_name"),
      reply_email: optional("reply_email"),
    },
  };
}
