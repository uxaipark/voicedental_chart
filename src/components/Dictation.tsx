import { useState } from 'react'
import type { AppState, Action } from '../state/chartReducer'
import type { useVoice } from '../state/useVoice'

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export function Dictation({
  state,
  dispatch,
  voice,
  onOpenCommands,
}: {
  state: AppState
  dispatch: (a: Action) => void
  voice: ReturnType<typeof useVoice>
  onOpenCommands: () => void
}) {
  const [text, setText] = useState('')
  const { status, submit, confirm, start, stop } = voice
  const listening = status.listening

  const run = () => {
    if (!text.trim()) return
    // Typed lines take the microphone's path — same normalisation, same parser.
    submit(text, 1, 'typed')
    setText('')
  }

  return (
    <div className="card-b">
      <div className="microw">
        <button
          className={`micbtn${listening ? ' live' : ''}`}
          onClick={() => (listening ? stop() : start())}
          disabled={!status.supported || state.voice.engine === 'off'}
          title={
            !status.supported
              ? 'This browser has no speech recognition'
              : state.voice.engine === 'off'
                ? 'Speech input is switched off in Voice ▸ Dictation Setup'
                : listening
                  ? 'Stop listening'
                  : 'Start listening'
          }
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="5.6" y="1.8" width="4.8" height="8" rx="2.4" fill="currentColor" />
            <path d="M3.4 7.6a4.6 4.6 0 0 0 9.2 0M8 12.2v2.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {listening ? 'Listening' : 'Start mic'}
        </button>
        <span className={`micstate${status.error ? ' err' : ''}`}>
          {status.error
            ? status.error
            : !status.supported
              ? 'No recogniser here — type below, it takes the same path'
              : state.voice.engine === 'off'
                ? 'Speech off — typing still works'
                : listening
                  ? state.voice.locale
                  : `${state.voice.locale} · ready`}
        </span>
      </div>

      <div className={`interim${status.interim ? ' has' : ''}`}>
        {status.interim || (listening ? 'listening…' : 'nothing heard yet')}
      </div>

      <div className="cmd">
        <input
          type="text"
          value={text}
          placeholder="say or type — tooth thirty · five four six · bleeding"
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button onClick={run}>Run</button>
      </div>

      <div className="uttlist">
        {state.utterances.length === 0 ? (
          <div className="note">
            Nothing recognised yet. Typing goes through the same normalisation and parser as the microphone, so it is
            also how the grammar gets tested. <button className="linkish" onClick={onOpenCommands}>See the commands</button>
          </div>
        ) : (
          state.utterances.slice(0, 12).map((u) => (
            <div key={u.id} className={`utt ${u.outcome}`}>
              <div className="u-head">
                <span className="u-time mono">{clock(u.at)}</span>
                <span className={`u-src ${u.source}`}>{u.source === 'speech' ? 'mic' : 'typed'}</span>
                <span className="u-conf mono" title="recogniser confidence">
                  {Math.round(u.confidence * 100)}%
                </span>
              </div>
              <div className="u-raw">“{u.raw}”</div>
              {u.text !== u.raw.toLowerCase() && <div className="u-norm mono">→ {u.text}</div>}
              <div className="u-msg">{u.message}</div>
              {u.outcome === 'held' && (
                <div className="u-actions">
                  <span className="u-why">below the confidence threshold</span>
                  <button className="chip sm" onClick={() => dispatch({ type: 'resolveUtterance', id: u.id, outcome: 'rejected' })}>Discard</button>
                  <button className="chip sm primary" onClick={() => confirm(u.id)}>Apply</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
