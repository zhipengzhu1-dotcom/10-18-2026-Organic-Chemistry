// A segmented toggle over one 3D card (Lesson 3, #81): "BF₃ | NH₃", "H₂O | CO₂". Each molecule
// opens in its own start view, keyed so switching back starts it fresh. `beside` sits next to the
// toggle (Lesson 3 puts the molecules' Lewis drawings there).
//
// Orbitals named only A and B (Lesson 8, #86, `orbitalLabels: hide`): both cards side by side on
// wide screens, an A | B toggle on phones (CSS `.molecule-pair`).
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MoleculeUse } from "@astratron/content";
import { useReducedMotion } from "../components/use-reduced-motion.ts";
import MoleculeCard, { type MoleculeCardProps } from "./MoleculeCard.tsx";

/** Lesson 4's autoplay (#82): seconds each toggle entry shows before the next. */
export const AUTOPLAY_STEP = 1.8;

export default function MoleculeSwitch({ molecule, beside, ...card }: MoleculeCardProps & { beside?: ReactNode }) {
  const all = [molecule, ...(molecule.toggle ?? [])];
  const [shown, setShown] = useState(0);
  const pair = molecule.orbitalLabels === "hide";
  // Lesson 4 (#82): step through the toggle once on entry (σ, then π, then both), ending on the
  // last; under reduced motion go straight to the last. Pressing the toggle stops it.
  const reduced = useReducedMotion();
  const playing = useRef(!!molecule.autoplay);
  useEffect(() => {
    if (!molecule.autoplay || reduced === undefined) return;
    if (reduced) {
      playing.current = false;
      setShown(all.length - 1);
      return;
    }
    const timer = setInterval(() => {
      if (!playing.current) return clearInterval(timer);
      setShown((i) => {
        if (i + 1 >= all.length - 1) playing.current = false;
        return Math.min(i + 1, all.length - 1);
      });
    }, AUTOPLAY_STEP * 1000);
    return () => clearInterval(timer);
  }, [molecule, reduced, all.length]);
  const row = (
    <div className="molecule-switch-row">
      <span
        className={pair ? "seg molecule-switch molecule-pair-toggle" : "seg molecule-switch"}
        role="group"
        aria-label={molecule.toggleLabel ?? (pair ? "Orbital" : "Molecule")}
        data-autoplay={molecule.autoplay ? "" : undefined}
      >
        {all.map((m: MoleculeUse, i) => (
          <button
            key={`${i}-${m.id}`}
            type="button"
            aria-pressed={i === shown}
            onClick={() => {
              playing.current = false;
              setShown(i);
            }}
          >
            {m.label ?? m.title}
          </button>
        ))}
      </span>
      {beside}
    </div>
  );
  if (pair)
    return (
      <div className="molecule-pair">
        {row}
        <div className="molecule-pair-cards">
          {all.map((m, i) => (
            <div key={`${i}-${m.id}`} className={i === shown ? "molecule-pair-card shown" : "molecule-pair-card"}>
              <MoleculeCard molecule={m} {...card} />
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <>
      {row}
      <MoleculeCard key={`${shown}-${all[shown].id}`} molecule={all[shown]} {...card} />
    </>
  );
}
