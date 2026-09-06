import type { Action, AppState } from '../state/chartReducer'
import { computeMetrics } from '../domain/metrics'
import { useState } from 'react'
import type { SaveState } from '../state/usePersistence'
import { TopMenu } from './TopMenu'
import type { VoiceDialogId } from './VoiceDialogs'

interface TopBarProps {
  state: AppState
  dispatch: (a: Action) => void
  save: SaveState
  filed: { id: number; at: number } | null
  onFileExam: () => void
  listening: boolean
  onVoiceDialog: (id: VoiceDialogId) => void
  formFactor: string | null
  onFormFactor: (id: string | null) => void
  densityNow: string
}

const SAVE_TEXT: Record<SaveState['status'], string> = {
  starting: 'Opening…',
  idle: 'Not saved yet',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
}

function SavePill({ save }: { save: SaveState }) {
  const when = save.at ? new Date(save.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : ''
  return (
    <span className={`savepill ${save.status}`} title={save.store === 'sqlite' ? 'Autosaving to SQLite' : 'The API is unreachable — kept in this browser'}>
      <i />
      {SAVE_TEXT[save.status]}
      {save.status === 'saved' && when && <em>{when}</em>}
      <b>{save.store === 'sqlite' ? 'SQLite' : 'local'}</b>
    </span>
  )
}

export function TopBar({ state, dispatch, save, filed, onFileExam, listening, onVoiceDialog, formFactor, onFormFactor, densityNow }: TopBarProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyJson = async () => {
    const payload = {
      exam: { ...state.meta, convention: 'GM positive = recession apical to CEJ; CAL = PD + GM' },
      indices: computeMetrics(state.chart),
      teeth: state.chart,
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopied('Copied')
    } catch {
      setCopied('Copy failed')
    }
    setTimeout(() => setCopied(null), 1600)
  }

  return (
    <header className="topbar">
      <div className="brand">
        <strong>Voice Dental Chart</strong>
      </div>
      <TopMenu
        active={state.activeChart}
        editCount={state.history.length}
        numbering={state.meta.numbering}
        teethShown={state.teethShown}
        density={state.density}
        densityNow={densityNow}
        filed={filed}
        onFileExam={onFileExam}
        onCopyJson={copyJson}
        copied={copied}
        listening={listening}
        onVoiceDialog={onVoiceDialog}
        formFactor={formFactor}
        onFormFactor={onFormFactor}
        dispatch={dispatch}
      />
      <div className="spacer" />
      <SavePill save={save} />
    </header>
  )
}
