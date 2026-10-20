// Reading single Problem files outside the full content build: the submissions triage (#76)
// checks new submissions against the Problem Bank and validates the Problem files it drafts.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { problemFile, type ProblemFile } from "./schema.ts";

/** Parses and validates one Problem file's text against the Problem schema. */
export function parseProblem(text: string): { problem?: ProblemFile; errors: string[] } {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (e) {
    return { errors: [`not valid YAML: ${(e as Error).message.split("\n")[0]}`] };
  }
  const parsed = problemFile.safeParse(raw);
  if (parsed.success) return { problem: parsed.data, errors: [] };
  return {
    errors: parsed.error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(file)"}: ${i.message}`),
  };
}

/** Every valid Problem file in `<subject dir>/problems`, draft or approved. Broken files are left to the content build. */
export function readBank(subjectDir: string): ProblemFile[] {
  const dir = join(subjectDir, "problems");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .flatMap((f) => parseProblem(readFileSync(join(dir, f), "utf8")).problem ?? []);
}
