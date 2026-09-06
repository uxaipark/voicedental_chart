import { useCallback, useEffect, useRef, useState } from 'react'
import type { Action, AppState } from './chartReducer'
import { computeMetrics, suggestStage } from '../domain/metrics'
import { commitExam, getDraft, postEdits, putDraft, type Store } from '../lib/persistence'

export interface SaveState {
  status: 'starting' | 'idle' | 'saving' | 'saved' | 'error'
  store: Store
  at?: number
  message?: string
}

const DEBOUNCE_MS = 600

export interface FiledExam { id: number; at: number }

export function usePersistence(state: AppState, dispatch: (a: Action) => void, examKey: string) {
  const [save, setSave] = useState<SaveState>({ status: 'starting', store: 'sqlite' })
  const [filed, setFiled] = useState<FiledExam | null>(null)
  const syncedSeq = useRef(0)
  const ready = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  // Pick up where the last session left off.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const draft = await getDraft(examKey)
      if (cancelled) {
        return
      }
      if (draft) {
        dispatch({ type: 'hydrate', payload: draft.state })
        syncedSeq.current = draft.state.historySeq ?? 0
        dispatch({ type: 'log', kind: 'system', tone: 'ok', text: `Draft restored · ${new Date(draft.updatedAt).toLocaleTimeString()}` })
        setSave({ status: 'saved', store: 'sqlite', at: draft.updatedAt })
      } else {
        setSave({ status: 'idle', store: 'sqlite' })
      }
      ready.current = true
    })()
    return () => { cancelled = true }
  }, [examKey, dispatch])

  // Autosave: every edit rewrites the draft and appends whatever is new to the log.
  useEffect(() => {
    if (!ready.current) return
    setSave((s) => ({ ...s, status: 'saving' }))
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const fresh = state.history.filter((e) => e.id > syncedSeq.current)
      const store = await putDraft(examKey, {
        patientChartNo: '1023-44871',
        meta: state.meta,
        chart: state.chart,
        optional: state.optional,
        teethShown: state.teethShown,
        panels: state.panels,
        voice: state.voice,
        historyIndex: state.historyIndex,
        historySeq: state.historySeq,
        history: state.history,
      })
      if (store === 'sqlite' && (await postEdits(examKey, fresh)) && fresh.length) {
        syncedSeq.current = fresh[fresh.length - 1].id
      }
      setSave({ status: 'saved', store, at: Date.now() })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer.current)
  }, [examKey, state.chart, state.meta, state.optional, state.teethShown, state.panels, state.voice, state.history, state.historyIndex, state.historySeq])

  const saveExam = useCallback(async () => {
    setSave((s) => ({ ...s, status: 'saving' }))
    const metrics = computeMetrics(state.chart)
    try {
      const { examId } = await commitExam({
        examKey,
        patientChartNo: '1023-44871',
        meta: state.meta,
        chart: state.chart,
        metrics,
        stage: suggestStage(metrics),
        grade: 'B',
      })
      setFiled({ id: examId, at: Date.now() })
      setSave({ status: 'saved', store: 'sqlite', at: Date.now(), message: `exam #${examId}` })
      dispatch({ type: 'log', kind: 'system', tone: 'ok', text: `Exam filed to SQLite · #${examId}` })
    } catch (err) {
      setSave({ status: 'error', store: 'local', message: String((err as Error)?.message ?? err) })
      dispatch({ type: 'log', kind: 'system', tone: 'err', text: 'Filing failed — the draft is still recorded' })
    }
  }, [examKey, state.chart, state.meta, dispatch])

  return { save, saveExam, filed }
}
