import type { Chart, ExamMeta, HistoryEntry } from '../domain/types'
import type { VoiceSettings } from '../domain/voice'
import type { DensityMode } from '../domain/density'

export interface DraftPayload {
  patientChartNo: string
  meta: ExamMeta
  chart: Chart
  optional: Record<string, boolean>
  teethShown: { U: boolean; L: boolean }
  panels: Record<string, boolean>
  density: DensityMode
  voice: VoiceSettings
  historyIndex: number
  historySeq: number
  history: HistoryEntry[]
}

export interface Draft {
  examKey: string
  revision: number
  updatedAt: number
  state: DraftPayload
}

export type Store = 'sqlite' | 'local'

const localKey = (examKey: string) => `perio.draft.${examKey}`

/** The API is optional. Without it the app still records — just into this browser. */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

export async function putDraft(examKey: string, payload: DraftPayload): Promise<Store> {
  try {
    await api(`/api/draft/${encodeURIComponent(examKey)}`, { method: 'PUT', body: JSON.stringify(payload) })
    return 'sqlite'
  } catch {
    try {
      localStorage.setItem(localKey(examKey), JSON.stringify({ updatedAt: Date.now(), state: payload }))
    } catch {
      /* private window, quota, or storage disabled — nothing more we can do here */
    }
    return 'local'
  }
}

export async function getDraft(examKey: string): Promise<Draft | null> {
  try {
    return await api<Draft>(`/api/draft/${encodeURIComponent(examKey)}`)
  } catch {
    try {
      const raw = localStorage.getItem(localKey(examKey))
      if (!raw) return null
      const { updatedAt, state } = JSON.parse(raw)
      return { examKey, revision: 0, updatedAt, state }
    } catch {
      return null
    }
  }
}

/**
 * The edit log is append-only. Undoing does not retract what was already
 * written — the draft's index is what says where the clinician currently is,
 * and the log stays a complete record of what happened.
 */
export async function postEdits(examKey: string, entries: HistoryEntry[]): Promise<boolean> {
  if (!entries.length) return true
  try {
    await api(`/api/edits/${encodeURIComponent(examKey)}`, { method: 'POST', body: JSON.stringify({ entries }) })
    return true
  } catch {
    return false
  }
}

export async function commitExam(body: unknown): Promise<{ examId: number; savedAt: number }> {
  return api('/api/exams', { method: 'POST', body: JSON.stringify(body) })
}
