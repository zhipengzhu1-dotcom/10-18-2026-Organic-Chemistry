// The Scene manifest check: the build fails on a Scene without its id,
// settable states, screen-reader text, reduced-motion behaviour, data sources,
// poster frame or video block (spec #56 story 103). Runs in `pnpm content:build`
// (via check-cli.ts) and in the site build.
import { z } from "zod";
import { invalidValue, type SceneCatalog } from "@astratron/content";
import type { SceneManifest, WatchSceneManifest } from "./types.ts";
import { defaultState } from "./state.ts";

export { defaultState };

const value = z.union([z.number(), z.string()]);
const stateSpec = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("range"),
    label: z.string().min(1),
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
    unitSymbol: z.string().optional(),
  }),
  z.strictObject({
    kind: z.literal("choice"),
    label: z.string().min(1),
    options: z.array(z.strictObject({ id: z.string().min(1), label: z.string().min(1) })).min(2),
    default: z.string(),
  }),
]);

const manifestSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes"),
  title: z.string().min(1),
  states: z.record(z.string(), stateSpec),
  describe: z.custom<SceneManifest["describe"]>((v) => typeof v === "function", {
    message: "needs screen-reader text: a function (state, t) => string",
  }),
  reducedMotion: z.string().min(1),
  data: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*\/\S+$/, "must be a cited-data ref like methane/r.CH")),
  duration: z.number().positive(),
  poster: z.strictObject({ t: z.number().min(0) }),
  video: z.strictObject({
    duration: z.number().positive(),
    timeline: z.array(z.strictObject({ at: z.number().min(0), state: z.record(z.string(), value) })).min(1),
    poster: z.number().min(0),
    aspects: z.array(z.enum(["16:9", "9:16"])).refine((a) => a.includes("16:9") && a.includes("9:16"), {
      message: "must render at both 16:9 and 9:16",
    }),
  }),
});

/** One message per broken rule, `scenes/<id>: <where>: <what>`; empty when every manifest is complete. */
export function checkManifests(manifests: readonly SceneManifest<any>[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const raw of manifests) {
    const name = typeof raw?.id === "string" ? raw.id : "(no id)";
    const at = (where: string, message: string) => errors.push(`scenes/${name}: ${where ? `${where}: ` : ""}${message}`);
    const parsed = manifestSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) at(issue.path.join("."), issue.message);
    } else {
      checkSemantics(parsed.data as SceneManifest, at);
    }
    if (seen.has(name)) at("", `id "${name}" is registered twice`);
    seen.add(name);
  }
  return errors;
}

function checkSemantics(m: SceneManifest, at: (where: string, message: string) => void) {
  for (const [name, spec] of Object.entries(m.states)) {
    if (spec.kind === "range" && spec.min >= spec.max) at(`states.${name}`, "min must be below max");
    const why = invalidValue(spec, spec.default);
    if (why) at(`states.${name}`, `default ${why}`);
  }
  if (m.poster.t > m.duration) at("poster", `t ${m.poster.t} is outside the Scene's ${m.duration} s`);
  const defaults = defaultState(m);
  let text = "";
  try {
    text = m.describe(defaults, m.poster.t);
  } catch (e) {
    at("describe", `throws for the default state: ${(e as Error).message}`);
  }
  if (typeof text !== "string" || !text.trim()) at("describe", "screen-reader text for the default state is empty");

  let last = -1;
  m.video.timeline.forEach((key, i) => {
    const where = `video.timeline.${i}`;
    for (const [name, v] of Object.entries(key.state)) {
      const spec = m.states[name];
      if (!spec) at(where, `no settable state "${name}"`);
      else {
        const why = invalidValue(spec, v as never);
        if (why) at(where, `state "${name}" ${why}`);
      }
    }
    if (key.at < last) at(where, "times must not go backwards");
    if (key.at > m.video.duration) at(where, `at ${key.at} is past the video's ${m.video.duration} s`);
    last = Math.max(last, key.at);
  });
  if (m.video.poster > m.video.duration) at("video.poster", `${m.video.poster} is past the video's ${m.video.duration} s`);
}

const watchSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "must be lowercase letters, digits and dashes"),
  title: z.string().min(1),
  render: z.strictObject({
    engine: z.literal("manim"),
    script: z.string().regex(/^[a-z0-9_]+\.py$/, "must be a Python file name in scenes/manim/"),
    sceneClass: z.string().regex(/^[A-Z]\w*$/, "must be a Python class name"),
  }),
  describe: z.custom<WatchSceneManifest["describe"]>((v) => typeof v === "function", {
    message: "needs screen-reader text: a function (cited) => string",
  }),
  reducedMotion: z.string().min(1),
  data: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]*\/\S+$/, "must be a cited-data ref like methane/r.CH")),
  text: z.record(z.string(), z.array(z.string().min(1))),
  duration: z.number().positive(),
  poster: z.number().min(0),
  aspects: z.array(z.enum(["16:9", "9:16"])).refine((a) => a.includes("16:9") && a.includes("9:16"), {
    message: "must render at both 16:9 and 9:16",
  }),
});

/**
 * The watch-only Scene check (#66), with the same `scenes/<id>: <where>: <what>`
 * messages as checkManifests. `interactive` are the registered React Scenes,
 * whose ids a watch-only Scene may not reuse.
 */
export function checkWatchManifests(
  manifests: readonly WatchSceneManifest[],
  interactive: readonly SceneManifest<any>[],
): string[] {
  const errors: string[] = [];
  const seen = new Set(interactive.map((m) => m.id));
  for (const raw of manifests) {
    const name = typeof raw?.id === "string" ? raw.id : "(no id)";
    const at = (where: string, message: string) => errors.push(`scenes/${name}: ${where ? `${where}: ` : ""}${message}`);
    const parsed = watchSchema.safeParse(raw);
    if (!parsed.success) for (const issue of parsed.error.issues) at(issue.path.join("."), issue.message);
    else {
      const m = parsed.data as WatchSceneManifest;
      if (m.poster > m.duration) at("poster", `${m.poster} is past the video's ${m.duration} s`);
      // Every cited value stood in by a placeholder; the real values are checked against the data in the tests.
      const stand = Object.fromEntries(m.data.map((ref) => [ref, { ref, value: 2, display: "2", full: "2" } as never]));
      let text: unknown = "";
      try {
        text = m.describe(stand);
      } catch (e) {
        at("describe", `throws: ${(e as Error).message}`);
      }
      if (typeof text !== "string" || !text.trim()) at("describe", "screen-reader text is empty");
    }
    if (seen.has(name)) at("", `id "${name}" is registered twice`);
    seen.add(name);
  }
  return errors;
}

/** What the content build needs to check Lesson Steps against the registered Scenes; watch-only Scenes have no settable states. */
export function sceneCatalog(
  manifests: readonly SceneManifest<any>[],
  watch: readonly WatchSceneManifest[] = [],
): SceneCatalog {
  return Object.fromEntries([
    ...manifests.map((m) => [m.id, { states: m.states, data: m.data }]),
    ...watch.map((m) => [m.id, { states: {}, data: m.data }]),
  ]);
}
