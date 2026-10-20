// Reading the Tutor route's NDJSON on the page (stream.ts), with `fetch` answering as the route would.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TutorEvent, TutorRequest } from "./contract.ts";
import { askTutor } from "./stream.ts";

const request = { message: "Hi", history: [], context: {} } as unknown as TutorRequest;

/** Answers every fetch with this status and body, sent in the given chunks. */
function routeAnswers(status: number, chunks: string[], type = "application/x-ndjson") {
  vi.stubGlobal("fetch", async () => {
    const body = new ReadableStream({
      start(c) {
        for (const chunk of chunks) c.enqueue(new TextEncoder().encode(chunk));
        c.close();
      },
    });
    return new Response(body, { status, headers: { "Content-Type": type } });
  });
}

async function eventsOf(): Promise<TutorEvent[]> {
  const events: TutorEvent[] = [];
  await askTutor(request, (e) => events.push(e));
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askTutor", () => {
  it("hands over each line as it arrives, however the chunks split it", async () => {
    routeAnswers(200, ['{"type":"reply","te', 'xt":"Wh"}\n{"type":"done","reply":"Why?","actions":[],"model":"Sonnet 5.5","effort":"low","ms":5}\n']);
    expect(await eventsOf()).toEqual([
      { type: "reply", text: "Wh" },
      { type: "done", reply: "Why?", actions: [], model: "Sonnet 5.5", effort: "low", ms: 5 },
    ]);
  });

  it("passes on the route's readable error when it refuses the question (a body over 64 KB)", async () => {
    routeAnswers(413, ['{"type":"error","message":"This conversation is too long for the Tutor (over 64 KB). Ask a shorter question."}\n']);
    expect(await eventsOf()).toEqual([{ type: "error", message: expect.stringMatching(/too long/) }]);
  });

  it("throws when the route answers with no NDJSON (it isn't there)", async () => {
    routeAnswers(404, ["Not found"], "text/plain");
    await expect(eventsOf()).rejects.toThrow(/404/);
  });
});
