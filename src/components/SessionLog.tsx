import type { AppState } from '../state/chartReducer'

/** What happened to the record — restores, filings, resets. Not dictation. */
export function SessionLog({ state }: { state: AppState }) {
  const entries = state.log.filter((l) => l.kind === 'system')
  return (
    <div className="card-b">
      {entries.length === 0 ? (
        <div className="note">Nothing yet this session. Restores, filings and resets are noted here.</div>
      ) : (
        <div className="log">
          {entries.map((l, i) => (
            <div key={i} className={l.tone}>{l.text}</div>
          ))}
        </div>
      )}
    </div>
  )
}
