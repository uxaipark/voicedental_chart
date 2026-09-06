PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

/* ---------------------------------------------------------------------------
   Two tiers of persistence.

   `exam_draft` is the working copy: one row per exam, the whole state as JSON,
   rewritten on a debounce as the clinician types. It is what a crashed tab or
   a closed laptop recovers from, and it is cheap enough to write constantly.

   `exam` / `exam_tooth` / `exam_site` are the committed record: normalized,
   queryable, and written once in a transaction when the exam is saved. This is
   what later exams get compared against, so it must never be half-written.

   `edit_log` is the audit trail — every value change, appended as it happens,
   with the tooth before and after so any point can be reconstructed exactly.
--------------------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS exam_draft (
  exam_key         TEXT PRIMARY KEY,
  patient_chart_no TEXT,
  exam_date        TEXT,
  updated_at       INTEGER NOT NULL,
  revision         INTEGER NOT NULL DEFAULT 0,
  state_json       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_key         TEXT NOT NULL,
  patient_chart_no TEXT,
  exam_date        TEXT NOT NULL,
  provider         TEXT,
  probe            TEXT,
  numbering        TEXT,
  sequence_mode    TEXT,
  entry_mode       TEXT,
  saved_at         INTEGER NOT NULL,
  stage            INTEGER,
  grade            TEXT,
  extent_pct       INTEGER,
  bop_pct          INTEGER,
  plaque_pct       INTEGER,
  mean_pd          REAL,
  mean_cal         REAL,
  sites_4          INTEGER,
  sites_5          INTEGER,
  sites_6          INTEGER,
  teeth_present    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_exam_key  ON exam(exam_key, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_pt   ON exam(patient_chart_no, exam_date DESC);

CREATE TABLE IF NOT EXISTS exam_tooth (
  exam_id   INTEGER NOT NULL REFERENCES exam(id) ON DELETE CASCADE,
  tooth     INTEGER NOT NULL,
  status    TEXT    NOT NULL,
  crown     INTEGER NOT NULL DEFAULT 0,
  mobility  INTEGER,
  rec_class TEXT,
  note      TEXT,
  PRIMARY KEY (exam_id, tooth)
);

CREATE TABLE IF NOT EXISTS exam_site (
  exam_id     INTEGER NOT NULL REFERENCES exam(id) ON DELETE CASCADE,
  tooth       INTEGER NOT NULL,
  surface     TEXT    NOT NULL CHECK (surface IN ('B','L')),
  site        TEXT    NOT NULL CHECK (site IN ('M','C','D')),
  pd          INTEGER,
  gm          INTEGER,
  cal         INTEGER,
  mgj         INTEGER,
  gi          INTEGER,
  furcation   INTEGER,
  bop         INTEGER NOT NULL DEFAULT 0,
  suppuration INTEGER NOT NULL DEFAULT 0,
  plaque      INTEGER NOT NULL DEFAULT 0,
  calculus    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exam_id, tooth, surface, site)
);
CREATE INDEX IF NOT EXISTS idx_site_exam ON exam_site(exam_id);
CREATE INDEX IF NOT EXISTS idx_site_deep ON exam_site(exam_id, pd DESC);

CREATE TABLE IF NOT EXISTS edit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_key    TEXT    NOT NULL,
  seq         INTEGER NOT NULL,
  at          INTEGER NOT NULL,
  tooth       INTEGER NOT NULL,
  surface     TEXT,
  site        TEXT,
  row_id      TEXT,
  label       TEXT    NOT NULL,
  before_json TEXT    NOT NULL,
  after_json  TEXT    NOT NULL,
  UNIQUE (exam_key, seq)
);
CREATE INDEX IF NOT EXISTS idx_edit_exam ON edit_log(exam_key, seq);
