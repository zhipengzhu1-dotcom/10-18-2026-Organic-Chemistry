// The Source note (GLOSSARY): a collapsed "ⓘ Where these numbers come from"
// under anything that shows chemistry numbers, generated from the cited-data
// lookup (ADR 0002), never written by hand. Scenes, Problems, Steps and
// viewers pass the Cited values they show. A Step's written note (`text`, HTML
// rendered at build time: credits and licences) comes first.
import type { Cited } from "@astratron/content/data";
import { sourceNote } from "@astratron/content/data";

export default function SourceNote({ cited, text }: { cited: Cited[]; text?: string }) {
  if (!cited.length && !text) return null;
  return (
    <details className="source-note">
      <summary>{cited.length ? "ⓘ Where these numbers come from" : "ⓘ Source"}</summary>
      {text && <p dangerouslySetInnerHTML={{ __html: text }} />}
      {sourceNote(cited).map((p, i) => (
        <p key={i}>
          {p.lead && <strong>{p.lead}</strong>} {p.text}
        </p>
      ))}
    </details>
  );
}
