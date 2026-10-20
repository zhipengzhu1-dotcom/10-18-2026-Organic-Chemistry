// Asks the Tutor route and hands each NDJSON line to `onEvent` as it arrives.
import { TUTOR_PATH, type TutorEvent, type TutorRequest } from "./contract.ts";

export async function askTutor(request: TutorRequest, onEvent: (e: TutorEvent) => void): Promise<void> {
  const res = await fetch(TUTOR_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
    body: JSON.stringify(request),
  });
  if (!res.ok || !res.body) throw new Error(`The Tutor route answered ${res.status}.`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (let i; (i = buffer.indexOf("\n")) >= 0; buffer = buffer.slice(i + 1)) {
      const line = buffer.slice(0, i);
      if (line) onEvent(JSON.parse(line) as TutorEvent);
    }
  }
}
