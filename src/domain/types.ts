export type Pos = 'M' | 'C' | 'D'
export type Surface = 'B' | 'L'
export type ToothStatus = 'present' | 'missing' | 'implant'

/** Rows that hold one value per site, per tooth, or that are computed. */
export type RowId =
  | 'mob' | 'imp' | 'furc'
  | 'bop' | 'plq' | 'clc' | 'sup'
  | 'gi' | 'mgj' | 'gm' | 'pd' | 'cal' | 'note'

export type MarkRow = 'bop' | 'plq' | 'clc' | 'sup'
export type NumericSiteRow = 'pd' | 'gm' | 'mgj' | 'furc' | 'gi'

export type SiteMap<T> = Partial<Record<Pos, T>>

export interface SurfaceData {
  pd: SiteMap<number>
  gm: SiteMap<number>
  mgj: SiteMap<number>
  furc: SiteMap<number>
  gi: SiteMap<number>
  bop: SiteMap<true>
  sup: SiteMap<true>
  plq: SiteMap<true>
  clc: SiteMap<true>
}

export interface Tooth {
  n: number
  status: ToothStatus
  crown: boolean
  mobility: number | null
  recClass: string
  note: string
  B: SurfaceData
  L: SurfaceData
}

export type Chart = Record<number, Tooth>

export interface Cursor {
  n: number
  surf: Surface
  p: Pos
  row: RowId
}

export interface SiteRef {
  n: number
  surf: Surface
  p: Pos
}

export type Numbering = 'uni' | 'fdi' | 'palmer'
export type SequenceMode = 'serpentine' | 'screen'

/**
 * Which rows the cursor walks on its own after a value is typed.
 * `pass` — probing depth and gingival margin each run as their own continuous
 *          pass across the arch. The default: both are recorded by sweeping.
 * `pd`   — probing depth only; the margin is filled in by hand where it matters.
 * `all`  — every measured row advances, MGJ, gingival index and furcation too.
 * `pair` — GM then PD at the same site, then on to the next site; the way a
 *          clinician calls "recession two, depth four" tooth by tooth.
 */
export type EntryMode = 'pass' | 'pd' | 'all' | 'pair'

export interface ExamMeta {
  date: string
  provider: string
  probe: string
  sequence: SequenceMode
  numbering: Numbering
  entry: EntryMode
}

/**
 * One recorded edit. Every mutation touches exactly one tooth, so keeping the
 * tooth before and after is both the smallest and the most exact record: undo
 * is a replacement, never a replayed calculation that could drift.
 */
export interface HistoryEntry {
  id: number
  at: number
  label: string
  n: number
  surf: Surface
  p: Pos
  row: RowId
  before: Tooth
  after: Tooth
}

export const HISTORY_LIMIT = 10000

export function emptySurface(): SurfaceData {
  return { pd: {}, gm: {}, mgj: {}, furc: {}, gi: {}, bop: {}, sup: {}, plq: {}, clc: {} }
}

export function emptyTooth(n: number): Tooth {
  return { n, status: 'present', crown: false, mobility: null, recClass: '', note: '', B: emptySurface(), L: emptySurface() }
}
