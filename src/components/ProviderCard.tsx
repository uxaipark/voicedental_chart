import type { Action, AppState } from '../state/chartReducer'
import type { EntryMode, ExamMeta, SequenceMode } from '../domain/types'
import { OPTIONAL_ROWS, ROWS } from '../domain/bands'

/**
 * How this exam is being recorded: who is recording it, with what, in what
 * order, and which rows are on. It sits above the patient because it describes
 * the visit rather than the person.
 */
export function ProviderCard({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { meta, optional } = state
  const set = (patch: Partial<ExamMeta>) => dispatch({ type: 'setMeta', patch })

  return (
    <div className="card-b provider">
      <label className="pf">
        <span>Exam</span>
        <input type="date" value={meta.date} onChange={(e) => set({ date: e.target.value })} />
      </label>

      <label className="pf">
        <span>Provider</span>
        <select value={meta.provider} onChange={(e) => set({ provider: e.target.value })}>
          <option>RDH J. Sandoval</option>
          <option>Dr. K. Rossi</option>
          <option>RDH M. Okafor</option>
        </select>
      </label>

      <label className="pf">
        <span>Probe</span>
        <select value={meta.probe} onChange={(e) => set({ probe: e.target.value })}>
          <option>UNC-15</option>
          <option>Williams</option>
          <option>PCP-11</option>
          <option>Nabers (furcation)</option>
        </select>
      </label>

      <label className="pf">
        <span>Sequence</span>
        <select value={meta.sequence} onChange={(e) => set({ sequence: e.target.value as SequenceMode })}>
          <option value="serpentine">Serpentine · 4 passes</option>
          <option value="screen">Left to right</option>
        </select>
      </label>

      <label className="pf">
        <span>Auto-advance</span>
        <select value={meta.entry} onChange={(e) => set({ entry: e.target.value as EntryMode })}>
          <option value="pass">Depth + margin passes</option>
          <option value="pd">Probing depth only</option>
          <option value="all">Every measured row</option>
          <option value="pair">GM + PD paired per site</option>
        </select>
      </label>

      <div className="pf stack">
        <span>Optional rows</span>
        <div className="checklist">
          {OPTIONAL_ROWS.map((r) => (
            <button
              key={r}
              role="switch"
              aria-checked={!!optional[r]}
              className={`switchrow${optional[r] ? ' on' : ''}`}
              onClick={() => dispatch({ type: 'toggleOptional', row: r })}
            >
              <span className="sw-label">{ROWS[r].label}</span>
              <span className="sw" aria-hidden="true"><i /></span>
            </button>
          ))}
        </div>
      </div>

      <p className="convention mono">GM + = recession apical to CEJ · CAL = PD + GM</p>
    </div>
  )
}
