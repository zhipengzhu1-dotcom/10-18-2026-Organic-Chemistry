// A segmented toggle over one 3D card (Lesson 3, #81): "BF₃ | NH₃", "H₂O | CO₂". Each molecule
// opens in its own start view, keyed so switching back starts it fresh. `beside` sits next to the
// toggle (Lesson 3 puts the molecules' Lewis drawings there).
//
// Orbitals named only A and B (Lesson 8, #86, `orbitalLabels: hide`): both cards side by side on
// wide screens, an A | B toggle on phones (CSS `.molecule-pair`).
import { useState, type ReactNode } from "react";
import type { MoleculeUse } from "@astratron/content";
import MoleculeCard, { type MoleculeCardProps } from "./MoleculeCard.tsx";

export default function MoleculeSwitch({ molecule, beside, ...card }: MoleculeCardProps & { beside?: ReactNode }) {
  const all = [molecule, ...(molecule.toggle ?? [])];
  const [shown, setShown] = useState(0);
  const toggle = (
    <span className={molecule.orbitalLabels === "hide" ? "seg molecule-switch molecule-pair-toggle" : "seg molecule-switch"} role="group" aria-label={molecule.orbitalLabels === "hide" ? "Orbital" : "Molecule"}>
      {all.map((m: MoleculeUse, i) => (
        <button key={`${i}-${m.id}`} type="button" aria-pressed={i === shown} onClick={() => setShown(i)}>
          {m.label ?? m.title}
        </button>
      ))}
    </span>
  );
  if (molecule.orbitalLabels === "hide")
    return (
      <div className="molecule-pair">
        <div className="molecule-switch-row">
          {toggle}
          {beside}
        </div>
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
      <div className="molecule-switch-row">
        {toggle}
        {beside}
      </div>
      <MoleculeCard key={`${shown}-${all[shown].id}`} molecule={all[shown]} {...card} />
    </>
  );
}
