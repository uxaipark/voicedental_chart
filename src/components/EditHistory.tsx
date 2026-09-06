import { useMemo } from 'react'
import type { Action, AppState } from '../state/chartReducer'
import { toothLabel } from '../domain/numbering'

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

/** Only a window around the cursor is rendered; the scrubber covers all of it. */
const WINDOW = 120

export function EditHistory({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { history, historyIndex, meta } = state

  const rows = useMemo(() => {
    const from = Math.max(0, historyIndex - WINDOW)
    const to = Math.min(history.length, historyIndex + WINDOW)
    return history.slice(from, to).map((e, i) => ({ e, idx: from + i })).reverse()
  }, [history, historyIndex])

  const undone = history.length - historyIndex

  return (
    <div className="card-b">
        <div className="rewind">
          <button className="chip" onClick={() => dispatch({ type: 'seek', to: 0 })} disabled={!historyIndex} title="Back to the start">⏮</button>
          <button className="chip" onClick={() => dispatch({ type: 'undo' })} disabled={!historyIndex} title="Undo (⌘Z)">⟲ Undo</button>
          <button className="chip" onClick={() => dispatch({ type: 'redo' })} disabled={!undone} title="Redo (⇧⌘Z)">Redo ⟳</button>
          <button className="chip" onClick={() => dispatch({ type: 'seek', to: history.length })} disabled={!undone} title="Forward to the latest">⏭</button>
        </div>

        <input
          className="scrub"
          type="range"
          min={0}
          max={history.length}
          value={historyIndex}
          onChange={(e) => dispatch({ type: 'seek', to: Number(e.target.value) })}
          aria-label="Scrub through the edit history"
          disabled={!history.length}
        />
        <div className="scrubmeta">
          <span>{historyIndex} applied</span>
          {undone > 0 && <span className="ahead">{undone} ahead</span>}
        </div>

        <div className="hlist">
          {history.length === 0 ? (
            <div className="note">Nothing recorded yet. Every value you type, mark you set and tooth you change lands here.</div>
          ) : (
            rows.map(({ e, idx }) => {
              const applied = idx < historyIndex
              const current = idx === historyIndex - 1
              return (
                <button
                  key={e.id}
                  className={`hrow${applied ? '' : ' ahead'}${current ? ' now' : ''}`}
                  onClick={() => dispatch({ type: 'seek', to: idx + 1 })}
                  title={applied ? 'Rewind to just after this edit' : 'Replay forward to this edit'}
                >
                  <span className="ht mono">{time(e.at)}</span>
                  <span className="hn mono">{toothLabel(e.n, meta.numbering)}</span>
                  <span className="hl">{e.label}</span>
                </button>
              )
            })
          )}
        </div>
    </div>
  )
}
