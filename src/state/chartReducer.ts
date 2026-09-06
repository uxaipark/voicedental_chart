import type { Chart, Cursor, ExamMeta, HistoryEntry, MarkRow, NumericSiteRow, Pos, RowId, SiteRef, Surface, Tooth, ToothStatus } from '../domain/types'
import { HISTORY_LIMIT } from '../domain/types'
import { ROWS } from '../domain/bands'
import { BANDS, band, bandOf, navigableRows } from '../domain/bands'
import { DEFAULT_OPTIONAL } from '../domain/bands'
import { siteOrder } from '../domain/numbering'
import { furcationSites, hasMgj } from '../domain/anatomy'
import { sampleChart } from '../domain/sample'
import type { Utterance, VocabRule, VoiceSettings } from '../domain/voice'
import type { DensityMode } from '../domain/density'
import { DEFAULT_VOICE } from '../domain/voice'

export type ChartView = 'perio' | 'implant' | 'restorative'

export const CHART_VIEWS: Array<{ id: ChartView; label: string; hint: string }> = [
  { id: 'perio', label: 'Perio chart', hint: 'Six-point probing, 32 teeth' },
  { id: 'implant', label: 'Implant chart', hint: 'Fixtures, platforms, peri-implant probing' },
  { id: 'restorative', label: 'Restorative', hint: 'Existing and planned restorations' },
]

export interface AppState {
  chart: Chart
  cursor: Cursor
  meta: ExamMeta
  optional: Record<string, boolean>
  /** tooth graphics, per arch */
  teethShown: { U: boolean; L: boolean }
  activeChart: ChartView
  /** how tightly the grid packs; 'auto' follows the room available */
  density: DensityMode
  /** which collapsible panels are open, by id; absent means open */
  panels: Record<string, boolean>
  voice: VoiceSettings
  /** what the recogniser heard this session, newest first */
  utterances: Utterance[]
  utteranceSeq: number
  /**
   * Two channels, because they answer different questions. `dictation` is what
   * the command bar just did; `system` is what happened to the record — it is
   * not a dictation result and does not belong in that card.
   */
  log: Array<{ text: string; tone: 'ok' | 'err'; kind: 'dictation' | 'system' }>
  history: HistoryEntry[]
  /** entries [0, historyIndex) are applied to the chart */
  historyIndex: number
  historySeq: number
}

export const initialState = (): AppState => ({
  chart: sampleChart(),
  cursor: { n: 3, surf: 'B', p: 'D', row: 'pd' },
  meta: { date: '2026-09-06', provider: 'RDH J. Sandoval', probe: 'UNC-15', sequence: 'serpentine', numbering: 'uni', entry: 'pass' },
  optional: { ...DEFAULT_OPTIONAL },
  teethShown: { U: true, L: true },
  activeChart: 'perio',
  density: 'auto',
  panels: {},
  voice: { ...DEFAULT_VOICE, vocabulary: DEFAULT_VOICE.vocabulary.map((v) => ({ ...v })) },
  utterances: [],
  utteranceSeq: 0,
  log: [],
  history: [],
  historyIndex: 0,
  historySeq: 0,
})

/* ---------- sequences ---------------------------------------------------- */

function screenOrder(chart: Chart) {
  const out: Record<string, SiteRef[]> = {}
  for (const b of BANDS) {
    const arr: SiteRef[] = []
    for (const n of b.teeth) {
      if (chart[n].status === 'missing') continue
      for (const p of siteOrder(n)) arr.push({ n, surf: b.surf, p })
    }
    out[b.id] = arr
  }
  return out
}

/** Serpentine: maxillary facial, back across the palatal, then the mandible. */
export function sequence(chart: Chart, mode: 'serpentine' | 'screen'): SiteRef[] {
  const s = screenOrder(chart)
  return mode === 'serpentine'
    ? [...s.UB, ...[...s.UL].reverse(), ...s.LL, ...[...s.LB].reverse()]
    : [...s.UB, ...s.UL, ...s.LL, ...s.LB]
}

/* ---------- immutable writes -------------------------------------------- */

function patchTooth(chart: Chart, n: number, fn: (t: Tooth) => Tooth): Chart {
  return { ...chart, [n]: fn(chart[n]) }
}

function writeSite(chart: Chart, n: number, surf: Surface, row: NumericSiteRow, p: Pos, value: number | null): Chart {
  return patchTooth(chart, n, (t) => {
    const map = { ...t[surf][row] }
    if (value === null) delete map[p]
    else map[p] = value
    return { ...t, [surf]: { ...t[surf], [row]: map } }
  })
}

function toggleMark(chart: Chart, n: number, surf: Surface, row: MarkRow, p: Pos, force?: boolean): Chart {
  return patchTooth(chart, n, (t) => {
    const map = { ...t[surf][row] }
    const next = force ?? !map[p]
    if (next) map[p] = true
    else delete map[p]
    return { ...t, [surf]: { ...t[surf], [row]: map } }
  })
}

/** MGJ is a single value read at the mid of the surface. */
const siteFor = (row: RowId, p: Pos): Pos => (row === 'mgj' ? 'C' : p)

function canWrite(chart: Chart, c: Cursor, row: RowId): boolean {
  if (chart[c.n].status === 'missing') return false
  if (row === 'furc') return furcationSites(c.n, c.surf).includes(c.p)
  if (row === 'mgj') return hasMgj(c.n, c.surf)
  return true
}

/* ---------- history ------------------------------------------------------ */

/**
 * Record a chart change. Anything past the current point is dropped, the way
 * every editor behaves once you undo and then type something new.
 */
function commit(state: AppState, chart: Chart, n: number, label: string, cursor = state.cursor): AppState {
  const before = state.chart[n]
  const after = chart[n]
  if (before === after) return { ...state, chart, cursor }
  const kept = state.history.slice(0, state.historyIndex)
  kept.push({
    id: state.historySeq + 1,
    at: Date.now(),
    label,
    n,
    surf: cursor.surf,
    p: cursor.p,
    row: cursor.row,
    before,
    after,
  })
  const overflow = Math.max(0, kept.length - HISTORY_LIMIT)
  return {
    ...state,
    chart,
    cursor,
    history: overflow ? kept.slice(overflow) : kept,
    historyIndex: kept.length - overflow,
    historySeq: state.historySeq + 1,
  }
}

const fmt = (v: number | null | undefined) => (v == null ? '–' : String(v))

/**
 * Move the chart to a point in the log.
 *
 * Rewinding walks backwards and replaying walks forwards, but either way the
 * winning write for a tooth is the one at the far end of the walk — so the
 * whole seek collapses into a single patch and one object spread, which is
 * what lets the time-machine slider stay smooth while it is being dragged.
 */
function seek(state: AppState, to: number): AppState {
  const target = Math.max(0, Math.min(state.history.length, to))
  if (target === state.historyIndex) return state
  const patch: Record<number, Tooth> = {}
  let i = state.historyIndex
  let edge: (typeof state.history)[number] | undefined
  while (i > target) { i--; const e = state.history[i]; patch[e.n] = e.before; edge = e }
  while (i < target) { const e = state.history[i]; patch[e.n] = e.after; edge = e; i++ }
  const cursor = edge ? { n: edge.n, surf: edge.surf, p: edge.p, row: edge.row } : state.cursor
  return { ...state, chart: { ...state.chart, ...patch }, historyIndex: target, cursor }
}

/* ---------- actions ------------------------------------------------------ */

export type Action =
  | { type: 'setCursor'; at: SiteRef; row?: RowId }
  | { type: 'moveScreen'; step: number }
  | { type: 'moveRow'; step: number }
  | { type: 'advance'; step: number; landOn?: RowId }
  | { type: 'setValue'; row: NumericSiteRow | 'mob' | 'cal'; value: number }
  | { type: 'clearValue' }
  | { type: 'toggleMark'; row: MarkRow; force?: boolean }
  | { type: 'applyTriplet'; row: 'pd' | 'gm'; values: number[] }
  | { type: 'setStatus'; n: number; status: ToothStatus }
  | { type: 'toggleCrown'; n: number }
  | { type: 'cycleTooth'; n: number }
  | { type: 'setNote'; n: number; note: string }
  | { type: 'setRecClass'; n: number; recClass: string }
  | { type: 'setMeta'; patch: Partial<ExamMeta> }
  | { type: 'toggleOptional'; row: RowId }
  | { type: 'setRow'; row: RowId }
  | { type: 'setTeethShown'; arch?: 'U' | 'L'; shown?: boolean }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'seek'; to: number }
  | { type: 'setChartView'; view: ChartView }
  | { type: 'setDensity'; density: DensityMode }
  | { type: 'resetToSample' }
  | { type: 'togglePanel'; id: string }
  | { type: 'setVoice'; patch: Partial<VoiceSettings> }
  | { type: 'addVocab'; rule: Omit<VocabRule, 'id'> }
  | { type: 'removeVocab'; id: string }
  | { type: 'pushUtterance'; utterance: Omit<Utterance, 'id'> }
  | { type: 'resolveUtterance'; id: number; outcome: Utterance['outcome']; message?: string }
  | { type: 'clearUtterances' }
  | { type: 'hydrate'; payload: Partial<AppState> & { history?: AppState['history'] } }
  | { type: 'log'; text: string; tone: 'ok' | 'err'; kind?: 'dictation' | 'system' }

export function reducer(state: AppState, action: Action): AppState {
  const { chart, cursor } = state

  switch (action.type) {
    case 'setCursor': {
      const b = band(bandOf(action.at.n, action.at.surf))
      const want = action.row ?? cursor.row
      const rows = navigableRows(b, state.optional)
      return { ...state, cursor: { ...action.at, row: rows.includes(want) ? want : 'pd' } }
    }

    case 'moveScreen': {
      const list = sequence(chart, 'screen').filter((s) => bandOf(s.n, s.surf) === bandOf(cursor.n, cursor.surf))
      const i = list.findIndex((s) => s.n === cursor.n && s.p === cursor.p)
      if (i < 0) return state
      const next = list[(i + action.step + list.length) % list.length]
      return { ...state, cursor: { ...next, row: cursor.row } }
    }

    case 'moveRow': {
      const rows = navigableRows(band(bandOf(cursor.n, cursor.surf)), state.optional)
      const i = Math.max(0, rows.indexOf(cursor.row))
      return { ...state, cursor: { ...cursor, row: rows[(i + action.step + rows.length) % rows.length] } }
    }

    case 'advance': {
      const list = sequence(chart, state.meta.sequence)
      const i = list.findIndex((s) => s.n === cursor.n && s.surf === cursor.surf && s.p === cursor.p)
      if (i < 0) return state
      const next = list[(((i + action.step) % list.length) + list.length) % list.length]
      const b = band(bandOf(next.n, next.surf))
      const rows = navigableRows(b, state.optional)
      const want = action.landOn ?? cursor.row
      return { ...state, cursor: { ...next, row: rows.includes(want) ? want : 'pd' } }
    }

    case 'setValue': {
      if (action.row === 'mob') {
        if (chart[cursor.n].status === 'missing') return state
        const was = chart[cursor.n].mobility
        return commit(state, patchTooth(chart, cursor.n, (t) => ({ ...t, mobility: action.value })), cursor.n,
          `Mobility ${fmt(was)} → ${action.value}`)
      }
      if (action.row === 'cal') {
        // CAL is never stored. Typing one resolves the margin instead, so the
        // three numbers can never drift out of agreement.
        if (chart[cursor.n].status === 'missing') return state
        const pd = chart[cursor.n][cursor.surf].pd[cursor.p]
        if (pd == null) return state
        const gm = action.value - pd
        return commit(state, writeSite(chart, cursor.n, cursor.surf, 'gm', cursor.p, gm), cursor.n,
          `CAL ${action.value} → GM ${gm}`)
      }
      if (!canWrite(chart, cursor, action.row)) return state
      const p = siteFor(action.row, cursor.p)
      const was = chart[cursor.n][cursor.surf][action.row][p]
      return commit(state, writeSite(chart, cursor.n, cursor.surf, action.row, p, action.value), cursor.n,
        `${ROWS[action.row].label} ${fmt(was)} → ${action.value}`)
    }

    case 'clearValue': {
      const label = `${ROWS[cursor.row].label} cleared`
      if (cursor.row === 'mob')
        return commit(state, patchTooth(chart, cursor.n, (t) => ({ ...t, mobility: null })), cursor.n, label)
      if (cursor.row === 'cal')
        return commit(state, writeSite(chart, cursor.n, cursor.surf, 'gm', cursor.p, null), cursor.n, 'CAL cleared')
      if (cursor.row === 'bop' || cursor.row === 'plq' || cursor.row === 'clc' || cursor.row === 'sup')
        return commit(state, toggleMark(chart, cursor.n, cursor.surf, cursor.row, cursor.p, false), cursor.n, label)
      const row = cursor.row as NumericSiteRow
      return commit(state, writeSite(chart, cursor.n, cursor.surf, row, siteFor(row, cursor.p), null), cursor.n, label)
    }

    case 'toggleMark': {
      if (chart[cursor.n].status === 'missing') return state
      const next = toggleMark(chart, cursor.n, cursor.surf, action.row, cursor.p, action.force)
      const on = !!next[cursor.n][cursor.surf][action.row][cursor.p]
      return commit(state, next, cursor.n, `${ROWS[action.row].label} ${on ? 'on' : 'off'}`)
    }

    case 'applyTriplet': {
      let next = chart
      siteOrder(cursor.n).forEach((p, i) => {
        const v = action.values[i]
        if (v != null) next = writeSite(next, cursor.n, cursor.surf, action.row, p, v)
      })
      return commit(state, next, cursor.n, `${ROWS[action.row].label} ${action.values.join(' ')}`)
    }

    case 'setStatus':
      return commit(state, patchTooth(chart, action.n, (t) => ({ ...t, status: action.status })), action.n,
        `Marked ${action.status}`)

    case 'toggleCrown':
      return commit(state, patchTooth(chart, action.n, (t) => ({ ...t, crown: !t.crown })), action.n,
        chart[action.n].crown ? 'Crown removed' : 'Crown added')

    case 'cycleTooth': {
      // The four states a tooth can be in on a chart, in the order a right
      // click walks them: missing → implant → crown → present.
      const t = chart[action.n]
      const at = t.status === 'missing' ? 0 : t.status === 'implant' ? 1 : t.crown ? 2 : 3
      const next: Partial<Tooth>[] = [
        { status: 'missing', crown: false },
        { status: 'implant', crown: false },
        { status: 'present', crown: true },
        { status: 'present', crown: false },
      ]
      const to = next[(at + 1) % 4]
      const name = to.status === 'present' ? (to.crown ? 'crown' : 'present') : to.status!
      return commit(state, patchTooth(chart, action.n, (tt) => ({ ...tt, ...to })), action.n, `Cycled to ${name}`)
    }

    case 'setNote':
      if (chart[action.n].note === action.note) return state
      return commit(state, patchTooth(chart, action.n, (t) => ({ ...t, note: action.note })), action.n,
        action.note ? `Note “${action.note}”` : 'Note cleared')

    case 'setRecClass':
      return commit(state, patchTooth(chart, action.n, (t) => ({ ...t, recClass: action.recClass })), action.n,
        action.recClass ? `Recession ${action.recClass}` : 'Recession class cleared')

    case 'setMeta':
      return { ...state, meta: { ...state.meta, ...action.patch } }

    case 'toggleOptional': {
      const optional = { ...state.optional, [action.row]: !state.optional[action.row] }
      const rows = navigableRows(band(bandOf(cursor.n, cursor.surf)), optional)
      return { ...state, optional, cursor: rows.includes(cursor.row) ? cursor : { ...cursor, row: 'pd' } }
    }

    case 'setRow': {
      const rows = navigableRows(band(bandOf(cursor.n, cursor.surf)), state.optional)
      return rows.includes(action.row) ? { ...state, cursor: { ...cursor, row: action.row } } : state
    }

    case 'setTeethShown': {
      if (action.arch) {
        const shown = action.shown ?? !state.teethShown[action.arch]
        return { ...state, teethShown: { ...state.teethShown, [action.arch]: shown } }
      }
      const shown = action.shown ?? !(state.teethShown.U && state.teethShown.L)
      return { ...state, teethShown: { U: shown, L: shown } }
    }

    case 'undo':
      return seek(state, state.historyIndex - 1)

    case 'redo':
      return seek(state, state.historyIndex + 1)

    case 'seek':
      return seek(state, action.to)

    case 'togglePanel':
      return { ...state, panels: { ...state.panels, [action.id]: !(state.panels[action.id] ?? true) } }

    case 'setVoice':
      return { ...state, voice: { ...state.voice, ...action.patch } }

    case 'addVocab':
      return {
        ...state,
        voice: {
          ...state.voice,
          vocabulary: [...state.voice.vocabulary, { ...action.rule, id: `v${Date.now().toString(36)}` }],
        },
      }

    case 'removeVocab':
      return { ...state, voice: { ...state.voice, vocabulary: state.voice.vocabulary.filter((v) => v.id !== action.id) } }

    case 'pushUtterance':
      return {
        ...state,
        utteranceSeq: state.utteranceSeq + 1,
        utterances: [{ ...action.utterance, id: state.utteranceSeq + 1 }, ...state.utterances].slice(0, 200),
      }

    case 'resolveUtterance':
      return {
        ...state,
        utterances: state.utterances.map((u) =>
          u.id === action.id ? { ...u, outcome: action.outcome, message: action.message ?? u.message } : u,
        ),
      }

    case 'clearUtterances':
      return { ...state, utterances: [] }

    case 'setChartView':
      return { ...state, activeChart: action.view }

    case 'setDensity':
      return { ...state, density: action.density }

    case 'resetToSample': {
      // Everything the draft carries goes back to its opening state. The one
      // exception is the history counter: the server's edit log is append-only
      // and keyed by (exam, seq), so restarting it would collide with the
      // discarded entries and new edits would be silently dropped.
      const fresh = initialState()
      return {
        ...fresh,
        historySeq: state.historySeq,
        log: [{ text: 'Everything reset — sample exam and default settings reloaded', tone: 'ok' as const, kind: 'system' as const }],
      }
    }

    case 'hydrate': {
      const p = action.payload
      return {
        ...state,
        chart: p.chart ?? state.chart,
        meta: { ...state.meta, ...p.meta },
        optional: p.optional ?? state.optional,
        teethShown: p.teethShown ?? state.teethShown,
        history: p.history ?? state.history,
        historyIndex: p.historyIndex ?? state.historyIndex,
        historySeq: p.historySeq ?? state.historySeq,
        activeChart: p.activeChart ?? state.activeChart,
        density: p.density ?? state.density,
        panels: p.panels ?? state.panels,
        // Merge, never replace: a draft written before a setting existed would
        // otherwise drop it back to undefined.
        voice: { ...state.voice, ...p.voice },
      }
    }

    case 'log':
      return {
        ...state,
        log: [{ text: action.text, tone: action.tone, kind: action.kind ?? 'dictation' }, ...state.log].slice(0, 60),
      }

    default:
      return state
  }
}
