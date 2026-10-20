// Explain: text (block Markdown) and maybe a Scene; nothing to answer, so it
// opens done and ships whole, with no answer key entry.
import type { Cited } from "../../data.ts";
import type { MoleculeUse, Phase, SceneUse, Visuals } from "../../model.ts";
import type { PlayState, StepRules } from "../play.ts";

export interface ExplainStep extends Visuals {
  id: string;
  phase: Phase;
  type: "explain";
  text: string;
  scene?: SceneUse;
  molecule?: MoleculeUse;
  citations?: Cited[];
}

export const explain = {
  secret: [] as const,
  blank: {},
  render: (s, { mdBlocks }) => ({ ...s, text: mdBlocks(s.text) }),
  outline: (s) => ({ lead: s.text, choices: [] }),
  answer: () => null,
  start: () => ({ tries: 0, done: true }),
  takes: (_answer): _answer is never => false,
  act: () => undefined,
} satisfies StepRules<ExplainStep, PlayState, never, never>;
