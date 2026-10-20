// Every answer-bearing field of a Step or Problem ships in the answer key (#90, story 99):
// a field named like an answer must be in ANSWER_FIELDS, or listed below as public on purpose.
import { expect, it } from "vitest";
import { z } from "zod";
import { ANSWER_FIELDS } from "../src/model.ts";
import { lessonFile, problemFile } from "../src/schema.ts";

/** Words in a field's name (camelCase split) that mark it as giving the answer away. */
const ANSWER_WORDS = ["answer", "answers", "correct", "hint", "hints", "reveal", "accept", "accepted", "replay", "result", "results", "solution", "tolerance", "expected", "stages"];

/** Fields named like an answer but shown before answering on purpose, by path: the reason why. */
const PUBLIC_ON_PURPOSE: Record<string, string> = {};

const answerNamed = (name: string) => name.split(/(?=[A-Z])/).some((w) => ANSWER_WORDS.includes(w.toLowerCase()));

/** The object fields reachable from a schema, as dotted paths (arrays, records, unions and wrappers see through). */
function fields(schema: z.core.$ZodType, path = ""): string[] {
  const def = schema._zod.def as unknown as Record<string, never> & { type: string };
  switch (def.type) {
    case "object":
      return Object.entries(def.shape as Record<string, z.core.$ZodType>).flatMap(([k, v]) => {
        const p = path ? `${path}.${k}` : k;
        return [p, ...fields(v, p)];
      });
    case "optional": case "nullable": case "default":
      return fields(def.innerType, path);
    case "array":
      return fields(def.element, path);
    case "record":
      return fields(def.valueType, path);
    case "pipe":
      return fields(def.out, path);
    case "union":
      return (def.options as z.core.$ZodType[]).flatMap((o) => fields(o, path));
    case "tuple":
      return (def.items as z.core.$ZodType[]).flatMap((o) => fields(o, path));
    default:
      return [];
  }
}

const typeOf = (option: z.core.$ZodType) => {
  const shape = (option._zod.def as unknown as { shape: Record<string, z.core.$ZodType> }).shape;
  return String((shape.type._zod.def as unknown as { values: unknown[] }).values[0]);
};

/** Every Step type and Problem type, by name, with its object schema. */
function stepSchemas(): [string, z.core.$ZodType][] {
  const steps = (lessonFile.shape.steps.element._zod.def as unknown as { out: { options: z.core.$ZodType[] } }).out.options;
  return [
    ...steps.map((s): [string, z.core.$ZodType] => [`${typeOf(s)} Step`, s]),
    ...problemFile.options.map((p): [string, z.core.$ZodType] => [`${typeOf(p)} Problem`, p]),
  ];
}

/** Why each answer-named field would reach the Lesson page's HTML, or nothing when it can't. */
function leaks(name: string, schema: z.core.$ZodType): string[] {
  const secret = new Set<string>(ANSWER_FIELDS);
  const explain = name === "explain Step";
  return fields(schema).flatMap((path) => {
    const [top] = path.split(".");
    if (!answerNamed(path.split(".").at(-1)!) || path in PUBLIC_ON_PURPOSE) return [];
    // Anything under a secret field ships in the key with it; an Explain Step ships whole.
    if (secret.has(top) && !explain) return [];
    const fix = explain
      ? "Explain Steps ship whole (answer-key.ts), so grade it in a graded Step type"
      : path === top
        ? "add it to ANSWER_FIELDS (content/src/model.ts)"
        : `only top-level fields are stripped: move it, or make "${top}" secret in ANSWER_FIELDS (content/src/model.ts)`;
    return [`${name}: "${path}" looks answer-bearing; ${fix}, or list it in PUBLIC_ON_PURPOSE with a reason`];
  });
}

it("walks every Step type and Problem type, down into nested fields", () => {
  const schemas = new Map(stepSchemas());
  expect([...schemas.keys()]).toEqual(expect.arrayContaining(["explain Step", "manipulate-goal Step", "check Step", "draw-arrows Problem"]));
  expect(schemas.size).toBe(16);
  expect(fields(schemas.get("tap-to-identify Step")!)).toEqual(expect.arrayContaining(["hints.text", "replay.pushes.from", "molecule.toggle.label"]));
});

it("every answer-bearing Step and Problem field is in ANSWER_FIELDS, or public on purpose", () => {
  expect(stepSchemas().flatMap(([name, schema]) => leaks(name, schema))).toEqual([]);
});

it("the check goes red on an unregistered answer field", () => {
  const step = z.strictObject({ type: z.literal("guess"), prompt: z.string(), correct: z.string(), correctPick: z.string(), tapOnly: z.strictObject({ hint: z.string() }) });
  expect(leaks("guess Step", step)).toEqual([
    'guess Step: "correctPick" looks answer-bearing; add it to ANSWER_FIELDS (content/src/model.ts), or list it in PUBLIC_ON_PURPOSE with a reason',
    'guess Step: "tapOnly.hint" looks answer-bearing; only top-level fields are stripped: move it, or make "tapOnly" secret in ANSWER_FIELDS (content/src/model.ts), or list it in PUBLIC_ON_PURPOSE with a reason',
  ]);
});
