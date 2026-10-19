-- Submitted Problems and Mistake reports (spec #56, ticket #75).
-- Never add a column for an IP address, user agent or cookie.
-- status: received -> screened-out | drafted -> accepted | rejected
-- Times are Unix epoch milliseconds (UTC).
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('problem', 'mistake')),
  unit TEXT NOT NULL,
  target_id TEXT,
  problem_text TEXT NOT NULL,
  answer TEXT NOT NULL,
  molecule TEXT,
  display_name TEXT,
  reply_email TEXT,
  consent INTEGER NOT NULL CHECK (consent = 1),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'screened-out', 'drafted', 'accepted', 'rejected')),
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  replied_at INTEGER
);
CREATE INDEX submissions_status ON submissions (status);
