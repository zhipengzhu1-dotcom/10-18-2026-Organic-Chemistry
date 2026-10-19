// The Source note (GLOSSARY): a collapsed "ⓘ Where these numbers come from"
// under anything that shows chemistry numbers, generated from the cited-data
// lookup (ADR 0002), never written by hand. Scenes, Problems, Steps and
// viewers pass the Cited values they show.
import type { Cited } from "@astratron/content/data";
import { sourceNote } from "@astratron/content/data";

/** `notice`: a licence notice the data asks to travel with it (the NIST acknowledgement). */
export default function SourceNote({ cited, notice }: { cited: Cited[]; notice?: string }) {
  if (!cited.length) return null;
  return (
    <details className="source-note">
      <summary>ⓘ Where these numbers come from</summary>
      {sourceNote(cited).map((p, i) => (
        <p key={i}>
          {p.lead && <strong>{p.lead}</strong>} {p.text}
        </p>
      ))}
      {notice && <p>{notice}</p>}
    </details>
  );
}
