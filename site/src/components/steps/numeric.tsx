// Numeric input: a number box with the fixed unit beside it; the unit is never typed. Enter checks.
import { StepPrompt, type View } from "./view.tsx";

export const numeric: View<"numeric"> = {
  Lead: StepPrompt,
  // The text typed so far; a wrong try leaves it in the box to edit.
  choice: (_step, draft) => draft ?? "",
  Answer: ({ step, screen, revealing, choice, choose, check }) =>
    !revealing && (
      <form
        className="numeric"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <input
          type="text"
          // The decimal keypad has no minus sign, so a negative answer gets the full keyboard.
          inputMode={step.answer < 0 ? "text" : "decimal"}
          autoComplete="off"
          aria-label="Answer"
          value={choice}
          disabled={screen.canContinue}
          onChange={(e) => choose(e.target.value)}
          className="numeric-box"
        />
        {step.unitSymbol && <span className="numeric-unit">{step.unitSymbol}</span>}
        {step.signKey && (
          // Phone number pads have no minus sign: the ± key flips the sign of what is typed.
          <button
            type="button"
            className="btn btn-secondary numeric-sign"
            aria-label="Change sign"
            disabled={screen.canContinue}
            onClick={() => choose(flipSign(choice))}
          >
            ±
          </button>
        )}
      </form>
    ),
};

/** "+1" ↔ "−1", "1" → "−1", "" → "−". */
function flipSign(text: string): string {
  const t = text.trim();
  if (/^[-−]/.test(t)) return t.slice(1);
  return `−${t.replace(/^\+/, "")}`;
}
