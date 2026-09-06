import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Action, AppState } from '../state/chartReducer'
import type { useVoice } from '../state/useVoice'
import { LOCALES } from '../domain/voice'

export type VoiceDialogId = 'setup' | 'commands' | 'training' | 'test'

export const VOICE_MENU: Array<{ id: VoiceDialogId; label: string; hint: string }> = [
  { id: 'setup', label: 'Dictation Setup', hint: 'Engine, language, confidence and read-back' },
  { id: 'commands', label: 'Voice commands', hint: 'Everything the recogniser understands' },
  { id: 'training', label: 'Voice training', hint: 'Teach it what it keeps mishearing' },
  { id: 'test', label: 'Voice test', hint: 'Run the pipeline without touching the chart' },
]

function Dialog({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dlg-h">
          <div>
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>
          <button className="dlg-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="dlg-b">{children}</div>
      </div>
    </div>
  )
}

const COMMANDS: Array<{ group: string; rows: Array<[string, string]> }> = [
  {
    group: 'Measurements',
    rows: [
      ['five four six', 'Probing depths for the three sites of this tooth, then move on'],
      ['recession two one two', 'Gingival margin for the three sites'],
      ['mgj four', 'Mucogingival junction on this surface'],
      ['gi two', 'Gingival index at this site'],
      ['mobility two', 'Miller mobility for this tooth'],
      ['furcation two', 'Glickman class at this furcation entrance'],
    ],
  },
  {
    group: 'Markers',
    rows: [
      ['bleeding', 'Bleeding on probing at this site'],
      ['suppuration', 'Exudate at this site'],
      ['plaque', 'Plaque at this site'],
      ['calculus', 'Calculus at this site'],
    ],
  },
  {
    group: 'Moving around',
    rows: [
      ['tooth fourteen', 'Jump to a tooth, in whatever numbering is active'],
      ['upper palatal', 'Switch arch and surface'],
      ['next', 'Advance one site along the probing sequence'],
      ['back', 'Step back one site'],
    ],
  },
  {
    group: 'Tooth status',
    rows: [
      ['missing', 'Mark the tooth missing and drop it from every index'],
      ['implant', 'Mark the tooth an implant'],
      ['present', 'Mark the tooth present again'],
      ['crown', 'Toggle the crown flag'],
    ],
  },
]

export function VoiceDialog({
  id, state, dispatch, voice, onClose,
}: {
  id: VoiceDialogId
  state: AppState
  dispatch: (a: Action) => void
  voice: ReturnType<typeof useVoice>
  onClose: () => void
}) {
  if (id === 'setup') {
    const v = state.voice
    return (
      <Dialog title="Dictation Setup" sub="How speech reaches the chart" onClose={onClose}>
        <div className={`support ${voice.status.supported ? 'ok' : 'no'}`}>
          {voice.status.supported
            ? 'This browser has speech recognition. It needs microphone permission.'
            : 'This browser has no speech recognition. Typing into the Dictation card takes the identical path, so everything below still applies.'}
        </div>

        <div className="frow">
          <label>Where audio goes</label>
          <div className="seg">
            <button
              className={`chip${v.processLocally ? ' on' : ''}`}
              onClick={() => dispatch({ type: 'setVoice', patch: { processLocally: true } })}
              disabled={!voice.status.onDeviceSupported}
            >
              On this machine
            </button>
            <button
              className={`chip${!v.processLocally ? ' on' : ''}`}
              onClick={() => dispatch({ type: 'setVoice', patch: { processLocally: false } })}
            >
              Cloud recogniser
            </button>
          </div>
        </div>

        <div className={`support ${v.processLocally && voice.status.onDevice === 'available' ? 'ok' : 'no'}`} style={{ marginTop: 10 }}>
          {!voice.status.onDeviceSupported ? (
            <>
              This browser cannot recognise locally, so audio is sent to the recogniser’s servers. That is a decision
              worth making deliberately for a chart holding patient data.
            </>
          ) : !v.processLocally ? (
            <>Audio is streamed to the recogniser’s servers. A local model is available for {v.locale} — switch above to keep it on this machine.</>
          ) : voice.status.onDevice === 'available' ? (
            <>The local model for {v.locale} is installed. Audio does not leave this machine.</>
          ) : voice.status.onDevice === 'downloadable' ? (
            <div className="installrow">
              <span>A local model for {v.locale} can be installed. Until it is, recognition falls back to the servers.</span>
              <button className="chip primary" onClick={voice.installModel} disabled={voice.status.installing}>
                {voice.status.installing ? 'Installing…' : 'Install model'}
              </button>
            </div>
          ) : voice.status.onDevice === 'downloading' ? (
            <>The local model is downloading.</>
          ) : (
            <>No local model for {v.locale}. Recognition uses the servers, or pick another language.</>
          )}
        </div>

        <div className="frow">
          <label>Speech input</label>
          <div className="seg">
            <button className={`chip${v.engine === 'browser' ? ' on' : ''}`} onClick={() => dispatch({ type: 'setVoice', patch: { engine: 'browser' } })}>Browser recogniser</button>
            <button className={`chip${v.engine === 'off' ? ' on' : ''}`} onClick={() => dispatch({ type: 'setVoice', patch: { engine: 'off' } })}>Off — type only</button>
          </div>
        </div>

        <div className="frow">
          <label htmlFor="loc">Language</label>
          <select id="loc" value={v.locale} onChange={(e) => dispatch({ type: 'setVoice', patch: { locale: e.target.value } })}>
            {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>

        <div className="frow">
          <label htmlFor="conf">Confirm below</label>
          <div className="slider">
            <input
              id="conf" type="range" min={0} max={100} step={5}
              value={Math.round(v.confirmBelow * 100)}
              onChange={(e) => dispatch({ type: 'setVoice', patch: { confirmBelow: Number(e.target.value) / 100 } })}
            />
            <span className="mono">{Math.round(v.confirmBelow * 100)}%</span>
          </div>
        </div>
        <p className="note">
          An utterance the recogniser is less sure of than this is held in the Dictation card with Apply and Discard
          instead of being written straight to the chart. Typed lines carry full confidence, so they always apply.
        </p>

        <div className="frow">
          <label>Read back</label>
          <div className="seg">
            <button className={`chip${v.readback ? ' on' : ''}`} onClick={() => dispatch({ type: 'setVoice', patch: { readback: !v.readback } })}>
              {v.readback ? 'Speaks the value back' : 'Silent'}
            </button>
          </div>
        </div>

        <div className="frow">
          <label>Microphone</label>
          <div className="seg">
            <button className={`chip${v.pushToTalk ? ' on' : ''}`} onClick={() => dispatch({ type: 'setVoice', patch: { pushToTalk: !v.pushToTalk } })}>
              {v.pushToTalk ? 'Push to talk' : 'Stays listening'}
            </button>
          </div>
        </div>
      </Dialog>
    )
  }

  if (id === 'commands') {
    return (
      <Dialog title="Voice commands" sub="Spoken or typed — the grammar is the same" onClose={onClose}>
        {COMMANDS.map((g) => (
          <div key={g.group} className="cmdgroup">
            <div className="eyebrow">{g.group}</div>
            <table className="cmdtable">
              <tbody>
                {g.rows.map(([say, does]) => (
                  <tr key={say}>
                    <td className="say">“{say}”</td>
                    <td className="does">{does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <p className="note">
          Number words are resolved before parsing, so “five four six” and “546” are the same utterance. Words a
          recogniser reliably mangles into digits — for, to, ate — are folded in too.
        </p>
      </Dialog>
    )
  }

  if (id === 'training') return <Training state={state} dispatch={dispatch} voice={voice} onClose={onClose} />
  return <VoiceTest state={state} voice={voice} onClose={onClose} />
}

function Training({ state, dispatch, voice, onClose }: {
  state: AppState; dispatch: (a: Action) => void; voice: ReturnType<typeof useVoice>; onClose: () => void
}) {
  const [heard, setHeard] = useState('')
  const [meant, setMeant] = useState('')
  const [probe, setProbe] = useState('buckle five four six')
  const result = voice.dryRun(probe)

  const add = () => {
    if (!heard.trim() || !meant.trim()) return
    dispatch({ type: 'addVocab', rule: { heard: heard.trim().toLowerCase(), meant: meant.trim().toLowerCase() } })
    setHeard(''); setMeant('')
  }

  return (
    <Dialog title="Voice training" sub="Teach it what it keeps mishearing" onClose={onClose}>
      <p className="note">
        A recogniser trained on general speech will not say “buccal”. Each rule rewrites what it heard into what you
        meant, before the parser sees it — so the fix is one line rather than a new grammar.
      </p>

      <div className="trainadd">
        <input value={heard} placeholder="it hears…" onChange={(e) => setHeard(e.target.value)} />
        <span className="arrow">→</span>
        <input value={meant} placeholder="you meant…" onChange={(e) => setMeant(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="chip primary" onClick={add}>Add</button>
      </div>

      <div className="vocablist">
        {state.voice.vocabulary.length === 0 ? (
          <div className="note">No corrections yet.</div>
        ) : (
          state.voice.vocabulary.map((r) => (
            <div key={r.id} className="vocab">
              <span className="vh">“{r.heard}”</span>
              <span className="arrow">→</span>
              <span className="vm mono">{r.meant}</span>
              <button className="chip sm" onClick={() => dispatch({ type: 'removeVocab', id: r.id })}>Remove</button>
            </div>
          ))
        )}
      </div>

      <div className="eyebrow" style={{ marginTop: 14 }}>Try a phrase</div>
      <input className="wide" value={probe} onChange={(e) => setProbe(e.target.value)} />
      <div className={`tryout ${result.tone}`}>{result.message}</div>
    </Dialog>
  )
}

function VoiceTest({ state, voice, onClose }: { state: AppState; voice: ReturnType<typeof useVoice>; onClose: () => void }) {
  const [phrase, setPhrase] = useState('tooth thirty, five four six, bleeding')
  const [conf, setConf] = useState(85)
  const out = voice.dryRun(phrase)
  const held = conf / 100 < state.voice.confirmBelow

  return (
    <Dialog title="Voice test" sub="The whole pipeline, with the chart left alone" onClose={onClose}>
      <input className="wide" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="say something like you would chairside" />

      <div className="frow" style={{ marginTop: 10 }}>
        <label htmlFor="tc">Pretend confidence</label>
        <div className="slider">
          <input id="tc" type="range" min={0} max={100} step={5} value={conf} onChange={(e) => setConf(Number(e.target.value))} />
          <span className="mono">{conf}%</span>
        </div>
      </div>

      <ol className="pipeline">
        {out.stages.map((s) => (
          <li key={s.name}>
            <span className="p-name">{s.name}</span>
            <span className="p-text mono">{s.text || '—'}</span>
          </li>
        ))}
        <li>
          <span className="p-name">parsed</span>
          <span className={`p-text ${out.tone}`}>{out.message}</span>
        </li>
        <li>
          <span className="p-name">outcome</span>
          <span className={`p-text ${out.tone === 'err' ? 'err' : held ? 'warn' : 'ok'}`}>
            {out.tone === 'err'
              ? 'rejected — nothing would change'
              : held
                ? `held for confirmation — below the ${Math.round(state.voice.confirmBelow * 100)}% threshold`
                : 'applied straight to the chart'}
          </span>
        </li>
      </ol>

      <p className="note">Nothing here touches the exam. Run it in the Dictation card when you want it to.</p>
    </Dialog>
  )
}
