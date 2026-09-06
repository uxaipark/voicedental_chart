import { useCallback, useEffect, useRef, useState } from 'react'
import type { Action, AppState } from './chartReducer'
import { reducer } from './chartReducer'
import { normalise, segments } from '../domain/voice'
import type { Stage } from '../domain/voice'
import { runDictation } from '../lib/dictation'
import { installOnDevice, onDeviceStatus, speechAvailable, startRecognition, supportsOnDevice } from '../lib/recognizer'
import type { OnDeviceStatus } from '../lib/recognizer'

export interface VoiceStatus {
  supported: boolean
  listening: boolean
  interim: string
  error: string | null
  /** whether this browser can recognise without sending audio away */
  onDeviceSupported: boolean
  onDevice: OnDeviceStatus
  installing: boolean
}

/**
 * One way in. A microphone result and a typed line are the same thing here —
 * the only difference is the confidence that comes with them — so the whole
 * chain can be exercised, demonstrated and tested from the keyboard.
 */
export function useVoice(state: AppState, dispatch: (a: Action) => void) {
  const [status, setStatus] = useState<VoiceStatus>({
    supported: speechAvailable(),
    listening: false,
    interim: '',
    error: null,
    onDeviceSupported: supportsOnDevice(),
    onDevice: 'unsupported',
    installing: false,
  })
  const rec = useRef<ReturnType<typeof startRecognition>>(null)
  // The reducer's state is a frame behind inside callbacks; read it from a ref.
  const latest = useRef(state)
  latest.current = state

  const submit = useCallback(
    (raw: string, confidence: number, source: 'speech' | 'typed') => {
      const s = latest.current
      const { text } = normalise(raw, s.voice.vocabulary)
      const parts = segments(text)
      if (!parts.length) return
      const held = confidence < s.voice.confirmBelow

      // Each segment is parsed against the cursor the one before it left behind,
      // so "tooth thirty, five four six, bleeding" lands where it should.
      const messages: string[] = []
      let ok = true
      let chart = s.chart
      let cursor = s.cursor
      const queued: Action[] = []
      for (const part of parts) {
        const parsed = runDictation(part, chart, cursor, s.meta.numbering)
        if (!parsed || parsed.tone === 'err') { ok = false; messages.push(parsed?.message ?? `Not understood: "${part}"`); break }
        messages.push(parsed.message)
        queued.push(...parsed.actions)
        const next = parsed.actions.reduce((st, a) => reducer(st, a), { ...s, chart, cursor })
        chart = next.chart
        cursor = next.cursor
      }

      dispatch({
        type: 'pushUtterance',
        utterance: {
          at: Date.now(),
          source,
          raw: raw.trim(),
          text,
          confidence,
          outcome: !ok ? 'rejected' : held ? 'held' : 'applied',
          message: messages.join(' · '),
        },
      })
      if (!ok || held) return
      for (const a of queued) dispatch(a)
      if (s.voice.readback && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(messages.join(', ')))
      }
    },
    [dispatch],
  )

  /** Apply an utterance that was held back for confirmation. */
  const confirm = useCallback(
    (id: number) => {
      const s = latest.current
      const u = s.utterances.find((x) => x.id === id)
      if (!u) return
      let chart = s.chart
      let cursor = s.cursor
      const queued: Action[] = []
      for (const part of segments(u.text)) {
        const parsed = runDictation(part, chart, cursor, s.meta.numbering)
        if (!parsed || parsed.tone === 'err') break
        queued.push(...parsed.actions)
        const next = parsed.actions.reduce((st, a) => reducer(st, a), { ...s, chart, cursor })
        chart = next.chart
        cursor = next.cursor
      }
      for (const a of queued) dispatch(a)
      dispatch({ type: 'resolveUtterance', id, outcome: queued.length ? 'applied' : 'rejected' })
    },
    [dispatch],
  )

  const stop = useCallback(() => {
    rec.current?.stop()
    rec.current = null
    setStatus((v) => ({ ...v, listening: false, interim: '' }))
  }, [])

  const start = useCallback(() => {
    if (rec.current) return
    setStatus((v) => ({ ...v, error: null }))
    const v = latest.current.voice
    rec.current = startRecognition(v.locale, v.processLocally, {
      onInterim: (t) => setStatus((v) => ({ ...v, interim: t })),
      onFinal: (t, c) => { setStatus((v) => ({ ...v, interim: '' })); submit(t, c, 'speech') },
      onError: (m) => { setStatus((v) => ({ ...v, error: m, listening: false })); rec.current = null },
      onEnd: () => { rec.current = null; setStatus((v) => ({ ...v, listening: false, interim: '' })) },
    })
    if (rec.current) setStatus((v) => ({ ...v, listening: true }))
  }, [submit])

  // The local model is per language, so re-check whenever the language changes.
  useEffect(() => {
    let cancelled = false
    onDeviceStatus(state.voice.locale).then((s) => { if (!cancelled) setStatus((v) => ({ ...v, onDevice: s })) })
    return () => { cancelled = true }
  }, [state.voice.locale])

  const installModel = useCallback(async () => {
    setStatus((v) => ({ ...v, installing: true }))
    const ok = await installOnDevice(latest.current.voice.locale)
    const next = await onDeviceStatus(latest.current.voice.locale)
    setStatus((v) => ({
      ...v,
      installing: false,
      onDevice: next,
      error: ok ? null : 'The local model could not be installed',
    }))
  }, [])

  useEffect(() => () => { rec.current?.abort?.() }, [])

  /** Run the pipeline without touching the chart — what Voice test shows. */
  const dryRun = useCallback(
    (raw: string): { stages: Stage[]; message: string; tone: 'ok' | 'err' } => {
      const s = latest.current
      const { text, stages } = normalise(raw, s.voice.vocabulary)
      const parts = segments(text)
      const messages: string[] = []
      let tone: 'ok' | 'err' = parts.length ? 'ok' : 'err'
      let chart = s.chart
      let cursor = s.cursor
      for (const part of parts) {
        const parsed = runDictation(part, chart, cursor, s.meta.numbering)
        if (!parsed || parsed.tone === 'err') { tone = 'err'; messages.push(parsed?.message ?? `Not understood: "${part}"`); break }
        messages.push(parsed.message)
        const next = parsed.actions.reduce((st, a) => reducer(st, a), { ...s, chart, cursor })
        chart = next.chart
        cursor = next.cursor
      }
      return { stages, message: messages.join(' · ') || 'Nothing recognised in that', tone }
    },
    [],
  )

  return { status, submit, confirm, start, stop, dryRun, installModel }
}
