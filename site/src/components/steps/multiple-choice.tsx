// Multiple choice: text choices (as chips when short) or structure cards; one pick or several.
import type { Structure } from "@astratron/content";
import { Bubble, html, StepPrompt, toggle, type View } from "./view.tsx";

export const multipleChoice: View<"multiple-choice"> = {
  Lead: StepPrompt,
  choice: (_step, draft) => draft ?? [],
  fresh: true,
  Answer: ({ step, page, screen, revealing, choice, choose }) => {
    if (revealing) return null;
    const pick = (id: string) => choose(toggle(choice, id, page.select === "one"));
    return (
      // Short text choices sit as chips: many to a row for one-word choices, two to a row under a figure.
      <div className={["opts", chips(step)].filter(Boolean).join(" ")} role="group" aria-label="Choices">
        {step.options.map((o) =>
          o.structure ? (
            // A structure card: the drawing is pre-rendered SVG; its text is the screen-reader label.
            <button
              key={o.id}
              type="button"
              className={`opt structure-card${pairCard(o.structure.structure) ? " structure-card-wide" : ""}`}
              aria-pressed={choice.includes(o.id)}
              disabled={screen.canContinue}
              onClick={() => pick(o.id)}
            >
              {/* The name comes from this hidden text, not aria-label: the drawing's letters (N, OH…)
                  would otherwise be visible text missing from the name (WCAG 2.5.3 Label in Name). */}
              <span className="sr">{o.text}</span>
              <Bubble />
              <span aria-hidden="true" {...html(o.structure.drawn?.svg ?? "")} />
            </button>
          ) : (
            <button
              key={o.id}
              type="button"
              className="opt"
              aria-pressed={choice.includes(o.id)}
              disabled={screen.canContinue}
              onClick={() => pick(o.id)}
            >
              <Bubble />
              <span {...html(o.text)} />
            </button>
          ),
        )}
      </div>
    );
  },
};

/** Short text for a chip, and a single word or two: under this many characters (HTML tags aside). */
const CHIP_TEXT = 42;
const WORD_TEXT = 12;

/**
 * How text choices are laid out: as word chips, as many to a row as fit (six or more one-word choices,
 * e.g. group names), or two to a row (short choices under a figure); else one to a row.
 */
function chips(step: { options: { text: string; structure?: unknown }[]; figures?: unknown[] }): string | undefined {
  if (step.options.some((o) => o.structure)) return undefined;
  const longest = Math.max(...step.options.map((o) => o.text.replace(/<[^>]*>/g, "").length));
  if (step.options.length >= 6 && longest < WORD_TEXT) return "opts-words";
  if (step.options.length >= 6 || (step.figures && longest < CHIP_TEXT)) return "opts-chips";
  return undefined;
}

/** A card that draws two molecules side by side (a "pair" card): such cards get a row each. */
function pairCard(structure: Structure): boolean {
  const seen = new Set([structure.atoms[0]?.id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const b of structure.bonds)
      if (seen.has(b.a) !== seen.has(b.b)) {
        seen.add(b.a).add(b.b);
        grew = true;
      }
  }
  return seen.size < structure.atoms.length;
}
