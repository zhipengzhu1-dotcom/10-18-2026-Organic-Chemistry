// The Source note (GLOSSARY): a collapsed note under a Step. Cited numbers'
// paragraphs are generated from the cited-data lookup (ADR 0002), never
// written by hand; a Step may add a written note (HTML, rendered from Markdown
// at build time) for what isn't a number: structures, wording, ideas.
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
