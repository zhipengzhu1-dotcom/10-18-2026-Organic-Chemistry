// Browser glue: fills the static pages' progress slots from the saved record.
// The rules live in record.ts and hub.ts; this file only reads and writes the DOM.
import { continueCard, type CatalogLesson } from "./hub.ts";
import { exportRecord, importRecord, lessonStatus, localDay, streakOn, unitCount, type LessonStatus } from "./record.ts";
import { readRecord, writeRecord } from "./store.ts";

const STATUS_TEXT: Record<LessonStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done",
};

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** The flame and number in the header. */
export function showStreak(now = new Date()): void {
  const { count, freezes } = streakOn(readRecord(), now);
  for (const el of document.querySelectorAll<HTMLElement>("[data-streak]")) {
    el.setAttribute("aria-label", `Streak: ${days(count)}`);
    el.querySelector("b")!.textContent = String(count);
  }
  // The line is in hand; its numbers go in the data face.
  const data = (n: number) => Object.assign(document.createElement("span"), { className: "data", textContent: String(n) });
  for (const el of document.querySelectorAll<HTMLElement>("[data-streak-text]")) {
    el.replaceChildren(
      "Streak: ",
      data(count),
      ` ${count === 1 ? "day" : "days"} · `,
      data(freezes),
      ` ${freezes === 1 ? "freeze" : "freezes"} left`,
    );
  }
}

/** Level select: each row's state and the Unit's "n of N Lessons". */
export function showUnitProgress(): void {
  const record = readRecord();
  const rows = [...document.querySelectorAll<HTMLElement>("[data-lesson-id]")];
  for (const row of rows) {
    const status = lessonStatus(record, row.dataset.lessonId!);
    const el = row.querySelector<HTMLElement>(".level-status");
    if (el) {
      el.dataset.status = status;
      el.textContent = STATUS_TEXT[status];
    }
  }
  const lessons = rows.map((row) => ({ id: row.dataset.lessonId!, onRamp: row.dataset.onRamp !== undefined }));
  // The Practice Set row: optional, but once done it counts toward the Unit.
  const practiceRow = document.querySelector<HTMLElement>("[data-practice-set]");
  const unitId = practiceRow?.dataset.practiceSet;
  const { done, total, practice } = unitId ? unitCount(record, lessons, unitId) : { ...unitCount(record, lessons), practice: false };
  const practiceStatus = practiceRow?.querySelector<HTMLElement>(".level-status");
  if (practiceStatus && practice) {
    practiceStatus.dataset.status = "done";
    practiceStatus.textContent = STATUS_TEXT.done;
  }
  for (const el of document.querySelectorAll("[data-unit-progress]"))
    el.textContent = `${done} of ${total} Lessons${practice ? " · Practice Set done" : ""}`;
}

/** Home page: the Hub's Continue card for returning visitors (the page shows the Hub when `last` is set). */
export function showHub(catalog: CatalogLesson[]): void {
  const card = continueCard(readRecord(), catalog);
  if (!card) return;
  const set = (name: string, text: string) => {
    const el = document.querySelector(`[data-continue="${name}"]`);
    if (el) el.textContent = text;
  };
  set("unit", card.unit);
  set("title", card.title);
  set("where", card.where);
  const link = document.querySelector<HTMLAnchorElement>('[data-continue="link"]');
  if (link) {
    link.href = card.url;
    link.textContent = card.action;
  }
}

/** Export to a file and import from one, so progress can move to another browser. */
export function wireExportImport(): void {
  document.querySelector("[data-export]")?.addEventListener("click", () => {
    const blob = new Blob([exportRecord(readRecord())], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `astratron-progress-${localDay(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const input = document.querySelector<HTMLInputElement>("[data-import]");
  const alert = document.querySelector<HTMLElement>("[data-import-error]");
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const result = importRecord(await file.text());
    input.value = "";
    if ("error" in result) {
      if (alert) alert.textContent = result.error;
      return;
    }
    writeRecord(result.record);
    location.reload();
  });
}
