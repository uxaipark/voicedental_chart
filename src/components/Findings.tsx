import { useMemo } from 'react'
import type { Action } from '../state/chartReducer'
import type { Chart, Numbering } from '../domain/types'
import { collectFindings } from '../domain/metrics'
import { toothLabel } from '../domain/numbering'

const TONE = { crit: 'var(--crit)', warn: 'var(--warn)', info: 'var(--ink-3)' } as const

export function Findings({ chart, numbering, dispatch }: { chart: Chart; numbering: Numbering; dispatch: (a: Action) => void }) {
  const list = useMemo(() => collectFindings(chart), [chart])
  return (
    <div className="card-b">
      <div className="findings">
          {list.length === 0 ? (
            <div className="note">No sites ≥ 6 mm, no suppuration, no furcation ≥ II.</div>
          ) : (
            list.map((f, i) => (
              <div key={i} className="finding" onClick={() => dispatch({ type: 'setCursor', at: { n: f.n, surf: f.surf, p: f.p }, row: 'pd' })}>
                <span className="sev" style={{ background: TONE[f.severity] }} />
                <span className="tn">{toothLabel(f.n, numbering)}</span>
                <span className="desc">{f.text}</span>
              </div>
            ))
          )}
        </div>
    </div>
  )
}
