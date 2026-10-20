// Explain: block Markdown (paragraphs, lists) in place of a prompt; nothing to answer.
import { html, type View } from "./view.tsx";

export const explain: View<"explain"> = {
  Lead: ({ step }) => <div className="explain-text" {...html(step.text)} />,
  tells: true,
};
