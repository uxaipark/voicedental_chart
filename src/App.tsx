import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { initialState, reducer } from './state/chartReducer'
import { usePersistence } from './state/usePersistence'
import { CHART_VIEWS } from './state/chartReducer'
import { band, bandOf } from './domain/bands'
import { HISTORY_LIMIT } from './domain/types'
import { collectFindings } from './domain/metrics'
import { Panel } from './components/Panel'
import { TopBar } from './components/Bars'
import { PerioChart } from './components/PerioChart'
import { SiteInspector } from './components/SiteInspector'
import { Indices } from './components/Indices'
import { Findings } from './components/Findings'
import { EditHistory } from './components/EditHistory'
import { SessionLog } from './components/SessionLog'
import { Dictation } from './components/Dictation'
import { VoiceDialog } from './components/VoiceDialogs'
import { DevFrame, FORM_FACTORS } from './components/DevFrame'
import { MIN_CHART_W, ViewportGate } from './components/ViewportGate'
import type { VoiceDialogId } from './components/VoiceDialogs'
import { useVoice } from './state/useVoice'
import { DataDictionary } from './components/DataDictionary'
import { ExamHistory, FoldButton, Legend, PatientBrief, PatientCard, RailSwitch } from './components/SidePanels'
import { ProviderCard } from './components/ProviderCard'

function ChartStub({ view, onBack }: { view: 'implant' | 'restorative'; onBack: () => void }) {
  const meta = CHART_VIEWS.find((v) => v.id === view)!
  return (
    <section className="card">
      <div className="card-h">
        <h3>{meta.label}</h3>
        <span className="eyebrow">not built yet</span>
      </div>
      <div className="card-b stub">
        <p className="stub-lead">{meta.hint}.</p>
        <p className="note">
          This chart has no screen yet. The perio chart is the one that records data today — the tooth anatomy,
          numbering, arch layout and persistence layer underneath it are shared, so this view is where they would be
          reused rather than rebuilt.
        </p>
        <button className="chip primary" onClick={onBack}>Back to the perio chart</button>
      </div>
    </section>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [railView, setRailView] = useState<'clinical' | 'record'>('clinical')
  const [panelsOpen, setPanelsOpen] = useState(true)
  const [peek, setPeek] = useState<'left' | 'right' | null>(null)
  const [formFactor, setFormFactor] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const [shellW, setShellW] = useState(Number.POSITIVE_INFINITY)
  const [ignoreWidth, setIgnoreWidth] = useState(false)

  // Measured from the shell rather than the window, so a form-factor preview is
  // held to the same requirement as a real screen of that size. contentRect is
  // the untransformed box, which is the CSS width the layout actually sees —
  // getBoundingClientRect would return the preview's scaled-down size instead.
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setShellW(Math.round(entry.contentRect.width)))
    ro.observe(el)
    setShellW(Math.round(el.clientWidth))
    return () => ro.disconnect()
  }, [formFactor])

  // The peeking panels hang below the top bar, whose height depends on how the
  // menu wraps, so it is measured rather than assumed.
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty('--topbar-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // One exam per patient per day; the key is what a reopened tab recovers by.
  const examKey = `1023-44871|${state.meta.date}`
  const { save, saveExam, filed } = usePersistence(state, dispatch, examKey)
  const voice = useVoice(state, dispatch)
  const [voiceDialog, setVoiceDialog] = useState<VoiceDialogId | null>(null)
  const meta = state.meta
  const findingCount = useMemo(() => collectFindings(state.chart).length, [state.chart])
  // Panels default to open; only what the clinician folded is stored.
  const panel = (id: string, title: string, extra?: React.ReactNode) => ({
    title,
    extra,
    open: state.panels[id] ?? true,
    onToggle: () => dispatch({ type: 'togglePanel', id }),
  })

  // Undo and redo work anywhere on the page, not only inside the chart.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      const el = e.target as HTMLElement
      if (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
      e.preventDefault()
      dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const leftRail =
    railView === 'clinical' ? (
      <>
        <Panel {...panel('provider', 'Provider', meta.provider.replace(/^(RDH|Dr\.)\s/, ''))}>
          <ProviderCard state={state} dispatch={dispatch} />
        </Panel>
        <PatientCard />
        <Panel {...panel('legend', 'Legend')}>
          <Legend />
        </Panel>
        <Panel {...panel('examHistory', 'Exam history', '5 visits')}>
          <ExamHistory />
        </Panel>
      </>
    ) : (
      <>
        <PatientBrief />
        <Panel {...panel('editHistory', 'Edit history', `${state.history.length.toLocaleString()} / ${HISTORY_LIMIT.toLocaleString()}`)}>
          <EditHistory state={state} dispatch={dispatch} />
        </Panel>
        <Panel {...panel('sessionLog', 'Session log', `${state.log.filter((l) => l.kind === 'system').length}`)}>
          <SessionLog state={state} />
        </Panel>
      </>
    )

  const rightRail = (
    <>
      <Panel {...panel('inspector', 'Site inspector', band(bandOf(state.cursor.n, state.cursor.surf)).label)}>
        <SiteInspector state={state} dispatch={dispatch} />
      </Panel>
      <Panel {...panel('dictation', 'Dictation', voice.status.listening ? 'listening' : 'voice or typed')}>
        <Dictation state={state} dispatch={dispatch} voice={voice} onOpenCommands={() => setVoiceDialog('commands')} />
      </Panel>
      <Panel {...panel('indices', 'Whole-mouth indices')}>
        <Indices chart={state.chart} />
      </Panel>
      <Panel {...panel('findings', 'Findings', `${findingCount} items`)}>
        <Findings chart={state.chart} numbering={state.meta.numbering} dispatch={dispatch} />
      </Panel>
    </>
  )

  const pin = () => { setPanelsOpen(true); setPeek(null) }

  const app = (
    <div className="appshell" ref={shellRef}>
      {shellW < MIN_CHART_W && !ignoreWidth && (
        <ViewportGate width={shellW} onOverride={() => setIgnoreWidth(true)} />
      )}
      <div ref={barRef}>
      <TopBar
        state={state}
        dispatch={dispatch}
        save={save}
        filed={filed}
        onFileExam={saveExam}
        listening={voice.status.listening}
        onVoiceDialog={setVoiceDialog}
        formFactor={formFactor}
        onFormFactor={setFormFactor}
      />
      </div>

      <FoldButton open={panelsOpen} onToggle={() => { setPanelsOpen((v) => !v); setPeek(null) }} />

      <div className={`main${panelsOpen ? '' : ' rail-min'}`}>
        {panelsOpen && (
        <aside className="rail-l">
          <RailSwitch value={railView} onChange={setRailView} />
          {leftRail}
        </aside>
        )}

        {state.activeChart === 'perio' ? (
          <section className="card">
            <div className="card-h">
              <h3>Full-mouth six-point chart</h3>
              <span className="eyebrow">click a cell · 0–9 value · B P C S mark · ← → ↑ ↓ move · Enter next · right-click a tooth to cycle its state</span>
            </div>
            <div className="card-b" style={{ padding: '4px 12px 2px' }}>
              <PerioChart state={state} dispatch={dispatch} />
            </div>
          </section>
        ) : (
          <ChartStub view={state.activeChart} onBack={() => dispatch({ type: 'setChartView', view: 'perio' })} />
        )}

        {panelsOpen && <aside className="rail-r">{rightRail}</aside>}

      </div>

      {!panelsOpen && (
        <>
          {/* Hover the edge and the panel slides out; it pins on a click. */}
          <div
            className="peekzone left"
            onMouseEnter={() => setPeek('left')}
            onMouseLeave={() => setPeek(null)}
          >
            <div className={`peekpanel left${peek === 'left' ? ' in' : ''}`} onClick={pin}>
              <RailSwitch value={railView} onChange={setRailView} />
              {leftRail}
              <p className="peekhint">Click anywhere here to keep the panels open</p>
            </div>
          </div>

          <div
            className="peekzone right"
            onMouseEnter={() => setPeek('right')}
            onMouseLeave={() => setPeek(null)}
          >
            <div className={`peekpanel right${peek === 'right' ? ' in' : ''}`} onClick={pin}>
              {rightRail}
              <p className="peekhint">Click anywhere here to keep the panels open</p>
            </div>
          </div>
        </>
      )}

      {voiceDialog && (
        <VoiceDialog id={voiceDialog} state={state} dispatch={dispatch} voice={voice} onClose={() => setVoiceDialog(null)} />
      )}

      <DataDictionary />

      <p className="foot">
        Sample chart: all 32 teeth charted, including partially erupted third molars and an implant at #19 — the stage,
        grade and extent shown are recomputed from whatever is on the chart. Demonstration data, not a patient record.
        Field set and layout compiled from the{' '}
        <a href="https://www.opendental.com/manual/perio.html">Open Dental perio chart specification</a>,{' '}
        <a href="https://www.periodontalchart-online.com/?lang=en-gb">periodontalchart-online</a>, and the AAP/EFP 2017
        classification.
      </p>
    </div>
  )

  const factor = FORM_FACTORS.find((f) => f.id === formFactor)
  if (!factor) return app
  return (
    <DevFrame factor={factor} onClose={() => setFormFactor(null)}>
      {app}
    </DevFrame>
  )
}
