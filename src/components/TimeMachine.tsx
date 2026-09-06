import { useMemo } from 'react'
import type { Action } from '../state/chartReducer'
import type { HistoryEntry, Numbering } from '../domain/types'
import { toothLabel } from '../domain/numbering'

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** Ticks stop being readable long before they stop being drawable. */
const TICK_LIMIT = 400

interface Props {
  history: HistoryEntry[]
  index: number
  numbering: Numbering
  open: boolean
  onToggle: () => void
  dispatch: (a: Action) => void
}

export function TimeMachine({ history, index, numbering, open, onToggle, dispatch }: Props) {
  const total = history.length
  const ahead = total - index
  const at = index > 0 ? history[index - 1] : undefined

  const ticks = useMemo(() => {
    if (!total || total > TICK_LIMIT) return []
    return history.map((e, i) => ({ id: e.id, pct: (i + 1) / total, applied: i < index }))
  }, [history, index, total])

  const pct = total ? (index / total) * 100 : 0

  return (
    <div className={`timemachine${open ? '' : ' shut'}`}>
      <button className="tm-head" onClick={onToggle} aria-expanded={open} title={open ? 'Collapse the time machine' : 'Expand the time machine'}>
        <span className="rail" />
        <span className="tm-title">Time machine</span>
        <span className="tm-edits mono">
          {total.toLocaleString()} <em>{total === 1 ? 'edit' : 'edits'}</em>
        </span>
        {ahead > 0 && <span className="tm-behind">rewound · {ahead} ahead</span>}
        <span className="tm-sub">drag to rewind the chart to any point — every value on screen follows</span>
        <span className="tm-count mono">
          {index}
          <em>/{total}</em>
        </span>
        <svg className="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* collapsed, the position is still worth reading at a glance */}
      <div className="tm-mini" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>

      <div className="tm-track">
        <button
          className="tm-step"
          onClick={() => dispatch({ type: 'undo' })}
          disabled={!index}
          aria-label="Step back one edit"
          title="Undo (⌘Z)"
        >
          ⟲
        </button>

        <div className="tm-slider">
          {ticks.length > 0 && (
            <div className="tm-ticks" aria-hidden="true">
              {ticks.map((t) => (
                <i key={t.id} className={t.applied ? 'on' : ''} style={{ left: `${t.pct * 100}%` }} />
              ))}
            </div>
          )}
          <input
            type="range"
            min={0}
            max={total}
            value={index}
            disabled={!total}
            onChange={(e) => dispatch({ type: 'seek', to: Number(e.target.value) })}
            aria-label="Rewind or replay the exam"
          />
        </div>

        <button
          className="tm-step"
          onClick={() => dispatch({ type: 'redo' })}
          disabled={!ahead}
          aria-label="Step forward one edit"
          title="Redo (⇧⌘Z)"
        >
          ⟳
        </button>
      </div>

      <div className="tm-now">
        {total === 0 ? (
          <span className="tm-empty">Nothing recorded yet — type a value and this fills in behind you.</span>
        ) : at ? (
          <>
            <span className="tm-time mono">{clock(at.at)}</span>
            <span className="tm-tooth mono">{toothLabel(at.n, numbering)}</span>
            <span className="tm-label">{at.label}</span>
            {ahead > 0 && <span className="tm-ahead">{ahead} edit{ahead === 1 ? '' : 's'} ahead</span>}
          </>
        ) : (
          <>
            <span className="tm-time mono">start</span>
            <span className="tm-label">before the first edit of this exam</span>
            <span className="tm-ahead">{ahead} ahead</span>
          </>
        )}
      </div>
    </div>
  )
}
