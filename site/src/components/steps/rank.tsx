// Rank / order: cards in one column; drag a card (mouse or touch), or focus it and press ↑/↓ to move it.
import { useEffect, useRef, useState } from "react";
import type { RankStep } from "@astratron/content";
import { html, StepPrompt, type View } from "./view.tsx";

export const rank: View<"rank"> = {
  Lead: StepPrompt,
  // The order the cards stand in: as dealt until moved. Once answered they stand in the right
  // order (the reveal moves them there).
  choice: (step, draft, screen) => (screen.canContinue && step.answer.length ? step.answer : (draft ?? step.items.map((item) => item.id))),
  Answer: ({ step, screen, revealing, choice, choose }) =>
    !revealing && (
      <RankCards
        key={step.id}
        step={step}
        order={choice}
        onChange={choose}
        locked={screen.canContinue}
        tags={screen.canContinue ? step.revealTags : undefined}
      />
    ),
};

interface RankCardsProps {
  step: RankStep;
  order: string[];
  onChange: (order: string[]) => void;
  locked: boolean;
  /** Once answered: each card's note on why it sits there. */
  tags?: Record<string, string>;
}

function RankCards({ step, order, onChange, locked, tags }: RankCardsProps) {
  const list = useRef<HTMLOListElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const text = (id: string) => step.items.find((item) => item.id === id)?.text ?? id;

  function moveTo(id: string, to: number, announce: boolean) {
    const from = order.indexOf(id);
    if (to < 0 || to >= order.length || to === from) return;
    const rest = order.filter((x) => x !== id);
    onChange([...rest.slice(0, to), id, ...rest.slice(to)]);
    if (announce) setSaid(`${plain(text(id))} moved to position ${to + 1} of ${order.length}.`);
  }

  // Reordering moves the card's DOM node, which drops focus; put it back.
  useEffect(() => {
    if (focusId) list.current?.querySelector<HTMLButtonElement>(`[data-id="${focusId}"]`)?.focus();
  }, [order, focusId]);

  // While dragging, the card goes to the slot under the pointer.
  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      const others = [...(list.current?.querySelectorAll<HTMLElement>("[data-id]") ?? [])].filter(
        (el) => el.dataset.id !== dragging,
      );
      const to = others.filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 <= e.clientY;
      }).length;
      moveTo(dragging!, to, false);
    }
    function drop() {
      const at = order.indexOf(dragging!);
      setSaid(`${plain(text(dragging!))} dropped at position ${at + 1} of ${order.length}.`);
      setDragging(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  });

  return (
    <>
      <p id={`${step.id}-rank-help`} className="sr">
        Drag a card, or focus it and press the up and down arrow keys to move it.
      </p>
      <ol ref={list} className="opts rank" aria-label="Order">
        {order.map((id, i) => {
          // A structure card (Lesson 7): the drawing is pre-rendered SVG; its text is the screen-reader label.
          const drawn = step.items.find((item) => item.id === id)?.structure?.drawn;
          return (
          <li key={id}>
            <button
              type="button"
              data-id={id}
              aria-describedby={`${step.id}-rank-help`}
              aria-disabled={locked}
              className={`opt${drawn ? " structure-card" : ""}${dragging === id ? " dragging" : ""}`}
              style={{ width: "100%", touchAction: "none", userSelect: "none", cursor: locked ? "default" : "grab" }}
              onFocus={() => setFocusId(id)}
              onBlur={() => setFocusId((f) => (f === id ? null : f))}
              onPointerDown={(e) => {
                if (locked || e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.focus();
                setDragging(id);
              }}
              onKeyDown={(e) => {
                if (locked) return;
                const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : null;
                if (to === null) return;
                e.preventDefault();
                moveTo(id, to, true);
              }}
            >
              {drawn ? (
                <>
                  {/* Named by hidden text, as structure choice cards are (WCAG 2.5.3 Label in Name). */}
                  <span className="sr">{text(id)}</span>
                  {/* The card's letter, which Hints name ("`a` gives every atom an octet"). */}
                  <span className="card-tag" aria-hidden="true">
                    {id}
                  </span>
                  <span aria-hidden="true" {...html(drawn.svg)} />
                </>
              ) : (
                <span {...html(text(id))} />
              )}
              {/* Once answered: why the card sits there (Lesson 7). */}
              {tags?.[id] && <span className="rank-tag"> {tags[id]}</span>}
            </button>
          </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr">
        {said}
      </p>
    </>
  );
}

/** Item text is HTML (rendered Markdown); announcements want plain words. */
function plain(htmlText: string): string {
  return htmlText.replace(/<[^>]*>/g, "");
}
