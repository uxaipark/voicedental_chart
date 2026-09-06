import { Fragment, memo, useCallback, useMemo } from 'react'
import type { ReactElement } from 'react'
import type { AppState, Action } from '../state/chartReducer'
import type { Chart, Cursor, EntryMode, MarkRow, NumericSiteRow, Pos, RowId } from '../domain/types'
import { BANDS, ROWS, activeRows, band, bandOf, navigableRows } from '../domain/bands'
import type { Band } from '../domain/bands'
import { LOWER, UPPER, siteOrder, toothLabel } from '../domain/numbering'
import { furcationSites, hasMgj } from '../domain/anatomy'
import { computeMetrics } from '../domain/metrics'
import { ToothBand } from './ToothBand'
import type { Density } from '../domain/density'
import { TimeMachine } from './TimeMachine'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
  density: Density
}

const MARK_ROWS: MarkRow[] = ['bop', 'plq', 'clc', 'sup']

/** Rows the cursor sweeps after a value is typed, per entry protocol. */
const SWEEPING_ROWS: Record<EntryMode, RowId[]> = {
  pass: ['pd', 'gm', 'cal'],
  pd: ['pd'],
  all: ['pd', 'gm', 'cal', 'mgj', 'gi', 'furc'],
  pair: [],
}
const isMark = (r: RowId): r is MarkRow => (MARK_ROWS as string[]).includes(r)

function valueAt(chart: Chart, n: number, surf: 'B' | 'L', p: Pos, row: RowId): number | null {
  const t = chart[n]
  if (row === 'mob') return t.mobility
  if (row === 'cal') {
    const pd = t[surf].pd[p]
    return pd == null ? null : pd + (t[surf].gm[p] ?? 0)
  }
  if (row === 'mgj') return t[surf].mgj.C ?? null
  const v = (t[surf] as any)[row]?.[p]
  return v ?? null
}

function severity(row: RowId, v: number | null): string {
  if (v == null) return ' empty'
  if (row === 'pd') return v >= 6 ? ' v-crit' : v >= 4 ? ' v-warn' : ''
  if (row === 'cal') return v >= 5 ? ' v-crit' : v >= 3 ? ' v-warn' : ''
  if (row === 'furc' || row === 'mob' || row === 'gi') return v >= 3 ? ' v-crit' : v >= 2 ? ' v-warn' : ''
  if (row === 'mgj') return v < 2 ? ' v-warn' : ''
  if (row === 'gm') return v < 0 ? ' v-neg' : ''
  return ''
}

const FURC_LABEL = ['0', 'I', 'II', 'III']

/* ---------- cells -------------------------------------------------------- */

interface CellProps {
  n: number
  surf: 'B' | 'L'
  p: Pos
  row: RowId
  chart: Chart
  cursor: Cursor
  dispatch: (a: Action) => void
  first: boolean
  last: boolean
}

const Cell = memo(function Cell({ n, surf, p, row, chart, cursor, dispatch, first, last }: CellProps) {
  const t = chart[n]
  const gone = t.status === 'missing'
  const na =
    gone ||
    (row === 'furc' && !furcationSites(n, surf).includes(p)) ||
    (row === 'mgj' && (!hasMgj(n, surf) || p !== 'C'))

  const current = cursor.n === n && cursor.surf === surf && cursor.p === p && cursor.row === row
  const cls = [
    'cell',
    isMark(row) ? 'mk' : '',
    first ? 'tooth-first' : '',
    last ? 'tooth-last' : '',
    gone ? 'gone' : na ? 'na' : '',
    current ? 'cur' : '',
    na ? '' : severity(row, valueAt(chart, n, surf, p, row)),
  ].join(' ')

  const onClick = useCallback(() => {
    if (na) return
    dispatch({ type: 'setCursor', at: { n, surf, p }, row })
    if (isMark(row)) dispatch({ type: 'toggleMark', row })
  }, [na, dispatch, n, surf, p, row])

  let content: ReactElement | string = ''
  if (!na) {
    if (isMark(row)) {
      content = t[surf][row][p] ? <i className={`mark m-${row}`} /> : ''
    } else {
      const v = valueAt(chart, n, surf, p, row)
      content = v == null ? '·' : row === 'furc' ? FURC_LABEL[Math.min(3, v)] : String(v)
    }
  }
  return <div className={cls} onClick={onClick}>{content}</div>
})

const ToothCell = memo(function ToothCell({ n, row, chart, cursor, dispatch, surf }: Omit<CellProps, 'p' | 'first' | 'last'>) {
  const t = chart[n]
  const gone = t.status === 'missing'
  if (row === 'imp') {
    return (
      <div
        className={`cell mk span3 tooth-first tooth-last${gone ? ' gone' : ''}`}
        onClick={() => !gone && dispatch({ type: 'setStatus', n, status: t.status === 'implant' ? 'present' : 'implant' })}
      >
        {t.status === 'implant' && <i className="mark" style={{ background: 'var(--implant)', borderRadius: 2, width: 11, height: 8 }} />}
      </div>
    )
  }
  if (row === 'note') {
    return (
      <div
        className={`cell notec tooth-first tooth-last${gone ? ' gone' : ''}`}
        contentEditable={!gone}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(e) => dispatch({ type: 'setNote', n, note: e.currentTarget.textContent?.trim() ?? '' })}
      >
        {t.note}
      </div>
    )
  }
  const current = cursor.n === n && cursor.surf === surf && cursor.row === 'mob'
  return (
    <div
      className={`cell span3 tooth-first tooth-last${gone ? ' gone' : ''}${current ? ' cur' : ''}${severity('mob', gone ? null : t.mobility)}`}
      onClick={() => !gone && dispatch({ type: 'setCursor', at: { n, surf, p: 'C' }, row: 'mob' })}
    >
      {gone ? '' : t.mobility == null ? '·' : t.mobility}
    </div>
  )
})

/* ---------- rows --------------------------------------------------------- */

function DataRow({ b, row, chart, cursor, dispatch }: { b: Band; row: RowId } & Pick<Props['state'], never> & {
  chart: Chart; cursor: Cursor; dispatch: (a: Action) => void
}) {
  const def = ROWS[row]
  const half = (list: number[]) =>
    list.map((n) => {
      if (def.kind === 'tooth' || def.kind === 'implant' || def.kind === 'note') {
        return <ToothCell key={n} n={n} surf={b.surf} row={row} chart={chart} cursor={cursor} dispatch={dispatch} />
      }
      return siteOrder(n).map((p, k) => (
        <Cell key={`${n}${p}`} n={n} surf={b.surf} p={p} row={row} chart={chart} cursor={cursor}
              dispatch={dispatch} first={k === 0} last={k === 2} />
      ))
    })
  return (
    <>
      <div className="rl" title={def.hint}>
        <span>{def.label}</span>
        {def.unit && <span className="u">{def.unit}</span>}
      </div>
      {half(b.teeth.slice(0, 8))}
      <div className="gapcell" />
      {half(b.teeth.slice(8, 16))}
    </>
  )
}

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M1.3 8s2.4-4.2 6.7-4.2S14.7 8 14.7 8s-2.4 4.2-6.7 4.2S1.3 8 1.3 8Z"
      fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="1.9" fill={open ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
    {!open && <line x1="2.6" y1="13.4" x2="13.4" y2="2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
  </svg>
)

function NumbersRow({ teeth, chart, cursor, dispatch, numbering, arch, shown }: {
  teeth: number[]; chart: Chart; cursor: Cursor; dispatch: (a: Action) => void; numbering: AppState['meta']['numbering']
  arch: 'U' | 'L'; shown: boolean
}) {
  const half = (list: number[]) =>
    list.map((n) => {
      const t = chart[n]
      return (
        <div
          key={n}
          className={`numcell${t.status === 'missing' ? ' off' : ''}${cursor.n === n ? ' sel' : ''}`}
          onClick={() => dispatch({ type: 'setCursor', at: { n, surf: cursor.surf, p: siteOrder(n)[1] }, row: 'pd' })}
        >
          {toothLabel(n, numbering)}
          {t.status === 'implant' ? <span className="tag">IMP</span> : t.crown ? <span className="tag">CR</span> : null}
        </div>
      )
    })
  return (
    <>
      {/* Centred in the label gutter: it belongs to the whole arch, not to a row. */}
      <div className="rl mid">
        {/* Icon and label are one control, so the word is clickable too. */}
        <button
          className="toothvis"
          onClick={() => dispatch({ type: 'setTeethShown', arch })}
          aria-pressed={shown}
          title={shown ? `Hide the ${arch === 'U' ? 'upper' : 'lower'} teeth` : `Show the ${arch === 'U' ? 'upper' : 'lower'} teeth`}
        >
          <EyeIcon open={shown} />
          <span>tooth</span>
        </button>
      </div>
      {half(teeth.slice(0, 8))}
      <div className="gapcell" />
      {half(teeth.slice(8, 16))}
    </>
  )
}

function ToothRow({ b, chart, dispatch, density }: { b: Band; chart: Chart; dispatch: (a: Action) => void; density: Density }) {
  return (
    <>
      <div className="rl" />
      <div className="toothrow">
        <ToothBand band={b} teeth={b.teeth.slice(0, 8)} chart={chart} gradKey={`${b.id}a`} dispatch={dispatch} density={density} />
      </div>
      <div className="gapcell" />
      <div className="toothrow">
        <ToothBand band={b} teeth={b.teeth.slice(8, 16)} chart={chart} gradKey={`${b.id}b`} dispatch={dispatch} density={density} />
      </div>
    </>
  )
}

const BandLabel = ({ b }: { b: Band }) => (
  <div className="bandlabel">
    <span className="rail" />
    <span className="bl">{b.label}</span>
    <span className="hint">
      {b.surf === 'B' ? 'facial / buccal' : b.arch === 'U' ? 'palatal' : 'lingual'} · three sites per tooth, mesial – mid – distal · roots face the data
    </span>
  </div>
)

function SummaryBar({ chart }: { chart: Chart }) {
  const m = useMemo(() => computeMetrics(chart), [chart])
  return (
    <div className="summary">
      <div>Avg. probing depth <b>{m.meanPd} mm</b></div>
      <div>Avg. attachment level <b>{m.meanCal} mm</b></div>
      <div className={m.bopPct >= 30 ? 'hot' : ''}>BOP <b>{m.bopPct} %</b></div>
      <div className={m.plqPct >= 40 ? 'hot' : ''}>PI <b>{m.plqPct} %</b></div>
      <div>Sites ≥ 5 mm <b>{m.p5}</b></div>
      <div className={m.p6 ? 'hot' : ''}>Sites ≥ 6 mm <b>{m.p6}</b></div>
    </div>
  )
}

/* ---------- the chart ---------------------------------------------------- */

export function PerioChart({ state, dispatch, density }: Props) {
  const { chart, cursor, optional, teethShown, meta } = state

  const entry = meta.entry

  /**
   * Auto-advance is a recording protocol, not a property of the field, so the
   * rows that sweep are a setting rather than a rule baked into each row.
   * Mobility is left out of every mode: it is one value per tooth, so moving
   * to the next site within the same tooth would be wrong.
   */
  const autoAdvance = useCallback(
    (row: RowId) => {
      if (entry === 'pair') {
        if (row === 'gm') dispatch({ type: 'setRow', row: 'pd' })
        else if (row === 'pd') dispatch({ type: 'advance', step: 1, landOn: 'gm' })
        return
      }
      if (SWEEPING_ROWS[entry].includes(row)) dispatch({ type: 'advance', step: 1 })
    },
    [entry, dispatch],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.target as HTMLElement).classList?.contains('notec')) return
      const k = e.key
      const row = cursor.row

      if (k >= '0' && k <= '9') {
        const d = Number(k)
        if (isMark(row)) {
          dispatch({ type: 'toggleMark', row, force: d > 0 })
        } else if (row === 'pd' || row === 'gm' || row === 'mgj' || row === 'cal') {
          dispatch({ type: 'setValue', row: row as NumericSiteRow | 'cal', value: d })
          autoAdvance(row)
        } else if (row === 'furc' || row === 'mob' || row === 'gi') {
          dispatch({ type: 'setValue', row: row as NumericSiteRow | 'mob', value: Math.min(3, d) })
          if (row !== 'mob') autoAdvance(row)
        }
        e.preventDefault()
        return
      }
      const low = k.toLowerCase()
      const shortcut: Record<string, MarkRow> = { b: 'bop', s: 'sup', p: 'plq', c: 'clc' }
      if (shortcut[low]) { dispatch({ type: 'toggleMark', row: shortcut[low] }); e.preventDefault(); return }
      if (k === 'ArrowRight') { dispatch({ type: 'moveScreen', step: 1 }); e.preventDefault(); return }
      if (k === 'ArrowLeft') { dispatch({ type: 'moveScreen', step: -1 }); e.preventDefault(); return }
      if (k === 'ArrowDown') { dispatch({ type: 'moveRow', step: band(bandOf(cursor.n, cursor.surf)).above ? 1 : -1 }); e.preventDefault(); return }
      if (k === 'ArrowUp') { dispatch({ type: 'moveRow', step: band(bandOf(cursor.n, cursor.surf)).above ? -1 : 1 }); e.preventDefault(); return }
      if (k === 'Enter' || k === 'Tab') { dispatch({ type: 'advance', step: e.shiftKey ? -1 : 1 }); e.preventDefault(); return }
      if (k === 'Backspace' || k === 'Delete') { dispatch({ type: 'clearValue' }); e.preventDefault() }
    },
    [cursor, dispatch, autoAdvance, entry],
  )

  return (
    <div className="chartwrap">
      <div className="chart" tabIndex={0} onKeyDown={onKeyDown}>
        <SummaryBar chart={chart} />
        {(['U', 'L'] as const).map((arch) => {
          const [b1, b2] = BANDS.filter((b) => b.arch === arch)
          const teeth = arch === 'U' ? UPPER : LOWER
          return (
            <Fragment key={arch}>
              <BandLabel b={b1} />
              <div className="grid rowtop">
                {activeRows(b1, optional).map((r) => (
                  <DataRow key={r} b={b1} row={r} chart={chart} cursor={cursor} dispatch={dispatch} />
                ))}
                {teethShown[arch] && <ToothRow b={b1} chart={chart} dispatch={dispatch} density={density} />}
              </div>
              <div className="grid">
                <NumbersRow
                  teeth={teeth} chart={chart} cursor={cursor} dispatch={dispatch}
                  numbering={meta.numbering} arch={arch} shown={teethShown[arch]}
                />
              </div>
              <div className="grid">
                {teethShown[arch] && <ToothRow b={b2} chart={chart} dispatch={dispatch} density={density} />}
                {activeRows(b2, optional).map((r) => (
                  <DataRow key={r} b={b2} row={r} chart={chart} cursor={cursor} dispatch={dispatch} />
                ))}
              </div>
              <BandLabel b={b2} />
              {arch === 'U' && (
                <TimeMachine
                  history={state.history}
                  index={state.historyIndex}
                  numbering={meta.numbering}
                  open={state.panels.timeMachine ?? true}
                  onToggle={() => dispatch({ type: 'togglePanel', id: 'timeMachine' })}
                  dispatch={dispatch}
                />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

export { navigableRows }
