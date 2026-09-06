/** Thin wrapper over the browser's speech recognition, if it has any. */
type Ctor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  /** Chrome's on-device path; absent on older builds */
  processLocally?: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}

export const speechCtor = (): Ctor | null =>
  (typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)) ||
  null

export const speechAvailable = () => speechCtor() !== null

/**
 * Chrome's default Web Speech path streams the audio to Google for
 * recognition. For a chart holding patient data that is a decision, not a
 * detail, so the on-device path is detected, offered and reported separately.
 */
export type OnDeviceStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported'

export const supportsOnDevice = (): boolean => {
  const SR = speechCtor() as any
  return !!SR && typeof SR.available === 'function' && 'processLocally' in (SR.prototype ?? {})
}

export async function onDeviceStatus(locale: string): Promise<OnDeviceStatus> {
  const SR = speechCtor() as any
  if (!supportsOnDevice()) return 'unsupported'
  try {
    const r = await SR.available({ langs: [locale], processLocally: true })
    return (r as OnDeviceStatus) ?? 'unavailable'
  } catch {
    return 'unsupported'
  }
}

/** Ask the browser to fetch the local model. Resolves when it is usable. */
export async function installOnDevice(locale: string): Promise<boolean> {
  const SR = speechCtor() as any
  if (!SR || typeof SR.install !== 'function') return false
  try {
    return !!(await SR.install({ langs: [locale], processLocally: true }))
  } catch {
    return false
  }
}

export interface RecognizerHandlers {
  onInterim: (text: string) => void
  onFinal: (text: string, confidence: number) => void
  onError: (message: string) => void
  onEnd: () => void
}

export function startRecognition(locale: string, processLocally: boolean, h: RecognizerHandlers) {
  const Ctor = speechCtor()
  if (!Ctor) { h.onError('This browser has no speech recognition'); return null }
  const rec = new Ctor()
  rec.lang = locale
  if (processLocally && supportsOnDevice()) rec.processLocally = true
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1
  rec.onresult = (e: any) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const alt = r[0]
      if (r.isFinal) h.onFinal(alt.transcript, typeof alt.confidence === 'number' ? alt.confidence : 0.9)
      else h.onInterim(alt.transcript)
    }
  }
  rec.onerror = (e: any) => h.onError(e?.error === 'not-allowed' ? 'Microphone permission denied' : String(e?.error ?? 'recognition error'))
  rec.onend = h.onEnd
  try { rec.start() } catch { h.onError('Could not start listening') }
  return rec
}
