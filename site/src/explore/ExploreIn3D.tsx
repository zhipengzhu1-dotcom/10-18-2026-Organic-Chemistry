// "Explore in 3D" (#71): a button on any Step or Problem that names a molecule. It opens a
// full-screen dialog with the same 3D viewer as the 3D Step card (#68, site/src/molecule/): turn,
// zoom and measure, in our cited colours and radii. three.js loads only when the view first draws.
// Esc or ✕ closes it and focus returns to the button. Screen readers get the molecule in words.
import { useEffect, useRef, useState } from "react";
import type { MoleculeUse } from "@astratron/content";
import { describeMolecule } from "@astratron/content/molecule";
import SourceNote from "../components/SourceNote.tsx";
import MoleculeCard from "../molecule/MoleculeCard.tsx";
import "./explore.css";

export default function ExploreIn3D({ molecule }: { molecule: MoleculeUse }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" className="btn btn-secondary explore-open" onClick={() => setOpen(true)}>
        {inDataFace("Explore in 3D")}
      </button>
      <dialog
        ref={dialog}
        className="explore"
        aria-labelledby={`explore-${molecule.id}-title`}
        // Esc (cancel) and the close button both end here.
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
      >
        {open && (
          <div className="explore-body">
            <div className="explore-head">
              <h2 id={`explore-${molecule.id}-title`}>{inDataFace(`${molecule.title} in 3D`)}</h2>
              <button type="button" className="btn explore-close" aria-label="Close 3D view" onClick={() => dialog.current?.close()}>
                ✕
              </button>
            </div>
            <MoleculeCard molecule={molecule} />
            <p className="explore-words">{inDataFace(describeMolecule(molecule, molecule.orientation))}</p>
            <SourceNote cited={molecule.cited} notice={molecule.notice} />
          </div>
        )}
      </dialog>
    </>
  );
}

/** Sets every number (the 3 of 3D, atom names like H1) in the data face, as the type rules ask. */
function inDataFace(text: string) {
  return text.split(/(\S*\d\S*)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="data">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
