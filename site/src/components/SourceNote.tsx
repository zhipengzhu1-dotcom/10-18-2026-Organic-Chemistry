// The Source note (GLOSSARY): a collapsed "ⓘ Where these numbers come from"
// under anything that shows chemistry numbers, generated from the cited-data
// lookup (ADR 0002), never written by hand. Scenes, Problems, Steps and
// viewers pass the Cited values they show. A Step's written attribution (its
// `sourceNote`: MIT OCW credit, PubChem CIDs) is shown in it too, after the numbers.
import type { Cited } from "@astratron/content/data";
import { sourceNote } from "@astratron/content/data";

/**
 * `notice`: a licence notice the data asks to travel with it (the NIST acknowledgement).
 * `note`: the Step's written attribution, build-rendered HTML.
 */
export default function SourceNote({ cited, notice, note }: { cited: Cited[]; notice?: string; note?: string }) {
  if (!cited.length && !note) return null;
  return (
    <details className="source-note">
      <summary>{cited.length ? "ⓘ Where these numbers come from" : "ⓘ Sources"}</summary>
      {sourceNote(cited).map((p, i) => (
        <p key={i}>
          {p.lead && <strong>{p.lead}</strong>} {p.text}
        </p>
      ))}
      {notice && <p>{notice}</p>}
      {note && <p dangerouslySetInnerHTML={{ __html: note }} />}
    </details>
  );
}
