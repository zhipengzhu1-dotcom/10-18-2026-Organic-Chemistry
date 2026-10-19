// A segmented toggle over one 3D card (Lesson 3, #81): "BF₃ | NH₃", "H₂O | CO₂". Each molecule
// opens in its own start view, keyed so switching back starts it fresh. `beside` sits next to the
// toggle (Lesson 3 puts the molecules' Lewis drawings there).
import { useState, type ReactNode } from "react";
import type { MoleculeUse } from "@astratron/content";
import MoleculeCard, { type MoleculeCardProps } from "./MoleculeCard.tsx";

export default function MoleculeSwitch({ molecule, beside, ...card }: MoleculeCardProps & { beside?: ReactNode }) {
  const all = [molecule, ...(molecule.toggle ?? [])];
  const [shown, setShown] = useState(0);
  return (
    <>
      <div className="molecule-switch-row">
        <span className="seg molecule-switch" role="group" aria-label="Molecule">
          {all.map((m: MoleculeUse, i) => (
            <button key={m.id} type="button" aria-pressed={i === shown} onClick={() => setShown(i)}>
              {m.label ?? m.title}
            </button>
          ))}
        </span>
        {beside}
      </div>
      <MoleculeCard key={all[shown].id} molecule={all[shown]} {...card} />
    </>
  );
}
