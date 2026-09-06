import type { RowId, Surface } from './types'
import { LOWER, UPPER } from './numbering'

export interface RowDef {
  label: string
  unit: string
  kind: 'tooth' | 'implant' | 'site' | 'mark' | 'calc' | 'note'
  /** shown on hover where the row needs a word of explanation */
  hint?: string
}

export const ROWS: Record<RowId, RowDef> = {
  mob: { label: 'Mobility', unit: '0–3', kind: 'tooth' },
  imp: { label: 'Implant', unit: '', kind: 'implant' },
  furc: { label: 'Furcation', unit: '0–III', kind: 'site' },
  bop: { label: 'Bleeding on Probing', unit: '', kind: 'mark' },
  plq: { label: 'Plaque', unit: '', kind: 'mark' },
  clc: { label: 'Calculus', unit: '', kind: 'mark' },
  sup: { label: 'Suppuration', unit: '', kind: 'mark' },
  gi: { label: 'Gingival Index', unit: '0–3', kind: 'site' },
  mgj: { label: 'MGJ', unit: 'mm', kind: 'site' },
  gm: { label: 'Gingival Margin', unit: 'mm', kind: 'site' },
  pd: { label: 'Probing Depth', unit: 'mm', kind: 'site' },
  cal: { label: 'Attachment Level', unit: 'mm', kind: 'calc', hint: 'Computed as PD + GM. Typing a value here back-solves the gingival margin.' },
  note: { label: 'Note', unit: '', kind: 'note' },
}

/** Rows the clinician can switch off when they are not part of the protocol. */
export const OPTIONAL_ROWS: RowId[] = ['clc', 'sup', 'mgj', 'gi', 'note']
export const DEFAULT_OPTIONAL: Record<string, boolean> = { clc: true, sup: true, mgj: true, gi: false, note: true }

export type BandId = 'UB' | 'UL' | 'LL' | 'LB'

export interface Band {
  id: BandId
  arch: 'U' | 'L'
  surf: Surface
  label: string
  teeth: number[]
  /** true when the data rows sit above the teeth — the roots then point up */
  above: boolean
  rows: RowId[]
}

export const BANDS: Band[] = [
  {
    id: 'UB', arch: 'U', surf: 'B', label: 'Upper · Buccal', teeth: UPPER, above: true,
    rows: ['mob', 'imp', 'furc', 'bop', 'plq', 'clc', 'sup', 'gi', 'mgj', 'gm', 'pd', 'cal'],
  },
  {
    id: 'UL', arch: 'U', surf: 'L', label: 'Upper · Palatal', teeth: UPPER, above: false,
    rows: ['gm', 'pd', 'cal', 'gi', 'sup', 'clc', 'plq', 'bop', 'furc', 'note'],
  },
  {
    id: 'LL', arch: 'L', surf: 'L', label: 'Lower · Lingual', teeth: LOWER, above: true,
    rows: ['note', 'furc', 'bop', 'plq', 'clc', 'sup', 'gi', 'mgj', 'gm', 'pd', 'cal'],
  },
  {
    id: 'LB', arch: 'L', surf: 'B', label: 'Lower · Buccal', teeth: LOWER, above: false,
    rows: ['gm', 'pd', 'cal', 'mgj', 'gi', 'sup', 'clc', 'plq', 'bop', 'furc', 'imp', 'mob'],
  },
]

export const bandOf = (n: number, surf: Surface): BandId => ((n <= 16 ? 'U' : 'L') + surf) as BandId
export const band = (id: BandId): Band => BANDS.find((b) => b.id === id)!

export function activeRows(b: Band, optional: Record<string, boolean>): RowId[] {
  return b.rows.filter((r) => !OPTIONAL_ROWS.includes(r) || optional[r])
}

/**
 * Rows the cursor can land on. Attachment level is included: PD, GM and CAL
 * are three numbers with one constraint, so entering any two fixes the third
 * and a clinician who measures from the CEJ can record CAL directly.
 */
export function navigableRows(b: Band, optional: Record<string, boolean>): RowId[] {
  return activeRows(b, optional).filter((r) => r !== 'note' && r !== 'imp')
}
