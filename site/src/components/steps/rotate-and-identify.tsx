// Rotate-and-identify 3D: the Student turns the molecule in the 3D card (StepPlayer draws it)
// and answers with text choices, two to a row when short.
import { Bubble, html, StepPrompt, toggle, type View } from "./view.tsx";

export const rotateAndIdentify: View<"rotate-and-identify"> = {
  Lead: StepPrompt,
  choice: (_step, draft) => draft ?? [],
  fresh: true,
  Answer: ({ step, page, screen, revealing, choice, choose }) =>
    !revealing && (
      <div className={shortOptions(step.options) ? "opts opts-pairs" : "opts"} role="group" aria-label="Choices">
        {step.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="opt"
            aria-pressed={choice.includes(o.id)}
            disabled={screen.canContinue}
            onClick={() => choose(toggle(choice, o.id, page.select === "one"))}
          >
            <Bubble />
            <span {...html(o.text)} />
          </button>
        ))}
      </div>
    ),
};

/** Choices short enough (plain words, e.g. "bent", "BF₃ only") to sit two to a row. */
const SHORT_OPTION = 24;
const shortOptions = (options: { text: string }[]) => options.every((o) => o.text.replace(/<[^>]*>/g, "").length <= SHORT_OPTION);
