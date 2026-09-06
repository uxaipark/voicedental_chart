import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const DB_PATH = process.env.PERIO_DB ?? join(here, '..', 'data', 'perio.sqlite')

mkdirSync(dirname(DB_PATH), { recursive: true })
export const db = new DatabaseSync(DB_PATH)
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'))

/** node:sqlite binds only null, number, string, bigint and buffers. */
const bind = (v) => (v === undefined || v === null ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v)

const SITES = ['M', 'C', 'D']
const SURFACES = ['B', 'L']

/* ---------- draft: rewritten as the clinician types ---------------------- */

const upsertDraft = db.prepare(`
  INSERT INTO exam_draft (exam_key, patient_chart_no, exam_date, updated_at, revision, state_json)
  VALUES (?, ?, ?, ?, 1, ?)
  ON CONFLICT(exam_key) DO UPDATE SET
    patient_chart_no = excluded.patient_chart_no,
    exam_date        = excluded.exam_date,
    updated_at       = excluded.updated_at,
    revision         = exam_draft.revision + 1,
    state_json       = excluded.state_json
`)
const selectDraft = db.prepare('SELECT * FROM exam_draft WHERE exam_key = ?')

export function saveDraft(examKey, payload) {
  upsertDraft.run(
    examKey,
    bind(payload.patientChartNo),
    bind(payload.meta?.date),
    Date.now(),
    JSON.stringify(payload),
  )
  const row = selectDraft.get(examKey)
  return { examKey, revision: row.revision, updatedAt: row.updated_at }
}

export function loadDraft(examKey) {
  const row = selectDraft.get(examKey)
  if (!row) return null
  return { examKey, revision: row.revision, updatedAt: row.updated_at, state: JSON.parse(row.state_json) }
}

/* ---------- edit log: appended, never rewritten -------------------------- */

const insertEdit = db.prepare(`
  INSERT OR IGNORE INTO edit_log
    (exam_key, seq, at, tooth, surface, site, row_id, label, before_json, after_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const countEdits = db.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(seq), 0) AS maxSeq FROM edit_log WHERE exam_key = ?')
const listEdits = db.prepare('SELECT * FROM edit_log WHERE exam_key = ? AND seq > ? ORDER BY seq LIMIT ?')

export const appendEdits = (examKey, entries) => {
  db.exec('BEGIN')
  try {
    for (const e of entries) {
      insertEdit.run(
        examKey, e.id, e.at, e.n,
        bind(e.surf), bind(e.p), bind(e.row), e.label,
        JSON.stringify(e.before), JSON.stringify(e.after),
      )
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return countEdits.get(examKey)
}

export const readEdits = (examKey, afterSeq = 0, limit = 10000) =>
  listEdits.all(examKey, afterSeq, limit).map((r) => ({
    id: r.seq, at: r.at, n: r.tooth, surf: r.surface, p: r.site, row: r.row_id,
    label: r.label, before: JSON.parse(r.before_json), after: JSON.parse(r.after_json),
  }))

/* ---------- committed exam: written once, in a transaction --------------- */

const insertExam = db.prepare(`
  INSERT INTO exam (exam_key, patient_chart_no, exam_date, provider, probe, numbering,
                    sequence_mode, entry_mode, saved_at, stage, grade, extent_pct,
                    bop_pct, plaque_pct, mean_pd, mean_cal, sites_4, sites_5, sites_6, teeth_present)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`)
const insertTooth = db.prepare(`
  INSERT INTO exam_tooth (exam_id, tooth, status, crown, mobility, rec_class, note)
  VALUES (?,?,?,?,?,?,?)
`)
const insertSite = db.prepare(`
  INSERT INTO exam_site (exam_id, tooth, surface, site, pd, gm, cal, mgj, gi, furcation,
                         bop, suppuration, plaque, calculus)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`)

export function commitExam({ examKey, patientChartNo, meta, chart, metrics, stage, grade }) {
  db.exec('BEGIN IMMEDIATE')
  try {
    insertExam.run(
      examKey, bind(patientChartNo), meta.date, bind(meta.provider), bind(meta.probe),
      bind(meta.numbering), bind(meta.sequence), bind(meta.entry), Date.now(),
      bind(stage), bind(grade), bind(metrics.extentPct),
      bind(metrics.bopPct), bind(metrics.plqPct),
      bind(Number(metrics.meanPd)), bind(Number(metrics.meanCal)),
      bind(metrics.p4), bind(metrics.p5), bind(metrics.p6), bind(metrics.teeth),
    )
    const examId = db.prepare('SELECT last_insert_rowid() AS id').get().id

    for (let n = 1; n <= 32; n++) {
      const t = chart[n]
      if (!t) continue
      insertTooth.run(examId, n, t.status, t.crown ? 1 : 0, bind(t.mobility), bind(t.recClass || null), bind(t.note || null))
      if (t.status === 'missing') continue
      for (const surf of SURFACES) {
        const o = t[surf] ?? {}
        for (const p of SITES) {
          const pd = o.pd?.[p]
          const gm = o.gm?.[p]
          const hasAny =
            pd != null || gm != null || o.mgj?.[p] != null || o.gi?.[p] != null || o.furc?.[p] != null ||
            o.bop?.[p] || o.sup?.[p] || o.plq?.[p] || o.clc?.[p]
          if (!hasAny) continue
          insertSite.run(
            examId, n, surf, p,
            bind(pd), bind(gm), bind(pd != null ? pd + (gm ?? 0) : null),
            bind(o.mgj?.[p]), bind(o.gi?.[p]), bind(o.furc?.[p]),
            o.bop?.[p] ? 1 : 0, o.sup?.[p] ? 1 : 0, o.plq?.[p] ? 1 : 0, o.clc?.[p] ? 1 : 0,
          )
        }
      }
    }
    db.exec('COMMIT')
    return { examId, savedAt: Date.now() }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export const listExams = (chartNo) =>
  chartNo
    ? db.prepare('SELECT * FROM exam WHERE patient_chart_no = ? ORDER BY exam_date DESC, saved_at DESC LIMIT 200').all(chartNo)
    : db.prepare('SELECT * FROM exam ORDER BY saved_at DESC LIMIT 200').all()

export function readExam(id) {
  const head = db.prepare('SELECT * FROM exam WHERE id = ?').get(id)
  if (!head) return null
  return {
    ...head,
    teeth: db.prepare('SELECT * FROM exam_tooth WHERE exam_id = ? ORDER BY tooth').all(id),
    sites: db.prepare('SELECT * FROM exam_site WHERE exam_id = ? ORDER BY tooth, surface, site').all(id),
  }
}

export const stats = () => ({
  path: DB_PATH,
  drafts: db.prepare('SELECT COUNT(*) AS n FROM exam_draft').get().n,
  exams: db.prepare('SELECT COUNT(*) AS n FROM exam').get().n,
  edits: db.prepare('SELECT COUNT(*) AS n FROM edit_log').get().n,
})
