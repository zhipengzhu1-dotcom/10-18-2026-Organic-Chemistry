// What a Step shows besides its interaction: drawn figures (pre-rendered SVG
// with their screen-reader text and captions) and an aside one tap away (a
// Scene, or a reference table of drawings) opened in a modal dialog.
import { useRef } from "react";
import type { Aside, Figure } from "@astratron/content";
import ScenePlayer from "./ScenePlayer.tsx";

const html = (text: string) => ({ dangerouslySetInnerHTML: { __html: text } });

/** One drawing: the SVG is decorative to screen readers, which read `alt` instead. */
function Drawing({ figure }: { figure: Figure }) {
  return <span className="figure-drawing" role="img" aria-label={figure.alt} {...html(figure.view.drawn?.svg ?? "")} />;
}

export function Figures({ figures }: { figures: Figure[] }) {
  return (
    <div className="figures">
      {figures.map((f, i) => (
        <figure key={i} className="figure">
          <Drawing figure={f} />
          {f.caption && <figcaption {...html(f.caption)} />}
        </figure>
      ))}
    </div>
  );
}

/** A button that opens the aside in a dialog; Escape or Close shuts it. */
export function AsideButton({ aside, stepId }: { aside: Aside; stepId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `aside-${stepId}`;
  return (
    <>
      <button type="button" className="btn btn-secondary aside-open" onClick={() => dialog.current?.showModal()}>
        {aside.label}
      </button>
      <dialog ref={dialog} className="aside" aria-labelledby={titleId}>
        <h2 id={titleId} className="aside-title">
          {aside.label}
        </h2>
        {aside.scene && (
          <ScenePlayer key={`aside-scene-${stepId}`} sceneId={aside.scene.id} state={aside.scene.state} cited={aside.scene.cited} />
        )}
        {aside.table && (
          <table className="aside-table">
            <thead>
              <tr>
                <td />
                {aside.table.columns.map((c, i) => (
                  <th key={i} scope="col" {...html(c)} />
                ))}
              </tr>
            </thead>
            <tbody>
              {aside.table.rows.map((row, r) => (
                <tr key={r}>
                  <th scope="row" {...html(row.head)} />
                  {row.cells.map((cell, c) => (
                    <td key={c}>{cell ? <Drawing figure={cell} /> : <span className="sr">none</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button type="button" className="btn btn-primary btn-block" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </dialog>
    </>
  );
}
