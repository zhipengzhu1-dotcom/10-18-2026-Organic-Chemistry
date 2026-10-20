// Asks the Tutor route and hands each NDJSON line to `onEvent` as it arrives. A refusal the route
// explains in NDJSON (a body over 64 KB) arrives as its `error` line, like any other failure.
import { lineSplitter, TUTOR_PATH, type TutorEvent, type TutorRequest } from "./contract.ts";

export async function askTutor(request: TutorRequest, onEvent: (e: TutorEvent) => void): Promise<void> {
  const res = await fetch(TUTOR_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify(request),
  });
  const ndjson = res.headers.get("Content-Type")?.startsWith("application/x-ndjson");
  if (!res.body || (!res.ok && !ndjson)) throw new Error(`The Tutor route answered ${res.status}.`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const lines = lineSplitter((line) => onEvent(JSON.parse(line) as TutorEvent));
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    lines.push(decoder.decode(value, { stream: true }));
  }
  lines.end();
}
