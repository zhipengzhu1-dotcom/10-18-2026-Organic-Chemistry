// Scenes in Steps (ADR 0001): checks each Scene a Step uses against the Scene
// catalog (built by the scenes module from the registered manifests) and
// resolves it to a full state plus its cited values.
import type { LessonFile, ProblemFile } from "./schema.ts";
import type { SceneCatalog, SceneStateSpec, SceneUse, SceneValue } from "./model.ts";
import { find, type CitedData } from "./data.ts";

type StepFile = LessonFile["steps"][number];
/** A Step's `scene` as written in the Lesson file. */
export type SceneUseFile ={ id: string; state?: Record<string, SceneValue> };

/** Why `value` can't be taken by the settable state, or undefined if it can. */
export function invalidValue(spec: SceneStateSpec, value: SceneValue): string | undefined {
  if (spec.kind === "range") {
    const stops = (Number(value) - spec.min) / spec.step;
    const ok =
      typeof value === "number" && value >= spec.min - 1e-9 && value <= spec.max + 1e-9 && Math.abs(stops - Math.round(stops)) < 1e-9;
    return ok ? undefined : `must be a number from ${spec.min} to ${spec.max} in steps of ${spec.step}`;
  }
  return spec.options.some((o) => o.id === value) ? undefined : `must be one of ${spec.options.map((o) => o.id).join(", ")}`;
}

/** Both values say the same thing (numbers compare within rounding). */
export const sameValue = (a: SceneValue, b: SceneValue) =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : a === b;

/** Messages for one Scene use: a registered id, settable states with valid values, cited data the Subject has. */
export function checkSceneUse(use: SceneUseFile | undefined, catalog: SceneCatalog, data: CitedData): string[] {
  if (!use) return [];
  const entry = catalog[use.id];
  if (!entry) return [`Scene "${use.id}" is not in the Scene registry`];
  const errors: string[] = [];
  const scene = `Scene "${use.id}"`;
  for (const [name, value] of Object.entries(use.state ?? {})) {
    const spec = entry.states[name];
    if (!spec) errors.push(`${scene} has no settable state "${name}"`);
    else {
      const why = invalidValue(spec, value);
      if (why) errors.push(`${scene} state "${name}" ${why}`);
    }
  }
  for (const ref of entry.data) if (!find(data, ref)) errors.push(`${scene} cites "${ref}", which is not in the cited data`);
  return errors;
}

/**
 * Messages for a Step's (or a Problem's) Scenes, its `scene` and its `revealScene`, and, for a
 * Manipulate Step, its control, answer and Hints.
 */
export function checkStepScene(step: StepFile | ProblemFile, catalog: SceneCatalog, data: CitedData): string[] {
  const use = "scene" in step ? (step.scene as SceneUseFile | undefined) : undefined;
  const reveal = "revealScene" in step ? (step.revealScene as SceneUseFile | undefined) : undefined;
  const errors = [...checkSceneUse(use, catalog, data), ...checkSceneUse(reveal, catalog, data)];
  if (use && catalog[use.id] && step.type === "manipulate-goal") return [...errors, ...checkStages(step, use, catalog)];
  if (!use || !catalog[use.id] || step.type !== "manipulate") return errors;
  const entry = catalog[use.id];
  const scene = `Scene "${use.id}"`;
  const spec = entry.states[step.control];
  if (!spec) return [...errors, `control "${step.control}" is not a settable state of ${scene}`];
  const valueError = (where: string, value: SceneValue) => {
    const why = invalidValue(spec, value);
    if (why) errors.push(`${where}: ${scene} state "${step.control}" ${why}`);
  };
  valueError("answer", step.answer);
  for (const hint of step.hints ?? []) for (const value of hint.match ?? []) valueError("a Hint matches", value);
  if (sameValue(use.state?.[step.control] ?? spec.default, step.answer))
    errors.push("the control starts on the answer; start it somewhere else");
  return errors;
}

type GoalStepFile = Extract<StepFile, { type: "manipulate-goal" }>;

/** A goal-state Manipulate Step: every stage's start and goal are states the Scene can take, and no stage opens done. */
function checkStages(step: GoalStepFile, use: SceneUseFile, catalog: SceneCatalog): string[] {
  const entry = catalog[use.id];
  const errors: string[] = [];
  const scene = `Scene "${use.id}"`;
  const values = (where: string, state: Record<string, SceneValue> = {}) => {
    for (const [name, value] of Object.entries(state)) {
      const spec = entry.states[name];
      const why = spec ? invalidValue(spec, value) : undefined;
      if (!spec) errors.push(`${where}: ${scene} has no settable state "${name}"`);
      else if (why) errors.push(`${where}: ${scene} state "${name}" ${why}`);
    }
  };
  let state: Record<string, SceneValue> = {
    ...Object.fromEntries(Object.entries(entry.states).map(([k, spec]) => [k, spec.default])),
    ...use.state,
  };
  step.stages.forEach((stage, i) => {
    values(`stage ${i + 1} start`, stage.start);
    values(`stage ${i + 1} goal`, stage.goal);
    state = { ...state, ...stage.start };
    if (reached(state, stage.goal)) errors.push(`stage ${i + 1} opens with its goal already reached`);
    state = { ...state, ...stage.goal };
  });
  return errors;
}

/** The state holds every value the goal asks for. */
export const reached = (state: Record<string, SceneValue>, goal: Record<string, SceneValue>) =>
  Object.entries(goal).every(([k, v]) => state[k] !== undefined && sameValue(state[k], v));

/** The Scene with every settable state filled (defaults from the catalog) and its cited values attached. */
export function resolveSceneUse(use: SceneUseFile, catalog: SceneCatalog | undefined, data: CitedData): SceneUse {
  const entry = catalog?.[use.id];
  const defaults = Object.fromEntries(Object.entries(entry?.states ?? {}).map(([k, spec]) => [k, spec.default]));
  const cited: SceneUse["cited"] = {};
  for (const ref of entry?.data ?? []) {
    const value = find(data, ref);
    if (value) cited[ref] = value;
  }
  return { id: use.id, state: { ...defaults, ...use.state }, cited };
}
