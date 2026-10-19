// The Source note (GLOSSARY): a collapsed "ⓘ Where these numbers come from"
// under anything that shows chemistry numbers, generated from the cited-data
// lookup (ADR 0002), never written by hand. Scenes, Problems, Steps and
// viewers pass the Cited values they show. A Step's own `source` line (where
// its example or wording comes from) leads the note; with no numbers the note
// is titled "Source".
import type { Cited } from "@astratron/content/data";
import { sourceNote } from "@astratron/content/data";

export default function SourceNote({ cited, line }: { cited: Cited[]; line?: string }) {
  if (!cited.length && !line) return null;
  return (
    <details className="source-note">
      <summary>{cited.length ? "ⓘ Where these numbers come from" : "ⓘ Source"}</summary>
      {line && <p>{line}</p>}
      {sourceNote(cited).map((p, i) => (
        <p key={i}>
          {p.lead && <strong>{p.lead}</strong>} {p.text}
        </p>
      ))}
    </details>
  );
}
