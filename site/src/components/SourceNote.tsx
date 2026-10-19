// The Source note (GLOSSARY): a collapsed "ⓘ Where these numbers come from"
// under anything that shows chemistry numbers, generated from the cited-data
// lookup (ADR 0002), never written by hand. Scenes, Problems, Steps and
// viewers pass the Cited values they show. A Step's written note (credits for
// its idea, wording and structures, already HTML) leads it; a Step with only
// a written note shows "ⓘ Sources".
import type { Cited } from "@astratron/content/data";
import { sourceNote } from "@astratron/content/data";

export default function SourceNote({ cited, note }: { cited: Cited[]; note?: string }) {
  if (!cited.length && !note) return null;
  return (
    <details className="source-note">
      <summary>{cited.length ? "ⓘ Where these numbers come from" : "ⓘ Sources"}</summary>
      {note && <p dangerouslySetInnerHTML={{ __html: note }} />}
      {sourceNote(cited).map((p, i) => (
        <p key={i}>
          {p.lead && <strong>{p.lead}</strong>} {p.text}
        </p>
      ))}
    </details>
  );
}
