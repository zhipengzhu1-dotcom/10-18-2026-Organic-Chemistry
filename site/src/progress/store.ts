// The progress record's home: one localStorage entry. Storage can be missing or
// refuse writes (private windows, blocked site data); the site then still works,
// it just doesn't remember.
import { emptyRecord, loadRecord, type ProgressRecord } from "./record.ts";

export const STORAGE_KEY = "astratron.progress";

export function readRecord(): ProgressRecord {
  try {
    return loadRecord(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyRecord();
  }
}

export function writeRecord(record: ProgressRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Not remembered; nothing else to do.
  }
}
