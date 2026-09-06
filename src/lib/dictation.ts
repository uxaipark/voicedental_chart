import type { Action } from '../state/chartReducer'
import type { Cursor, Chart, Numbering, Surface } from '../domain/types'
import { parseToothLabel, siteOrder, toothLabel, isUpper } from '../domain/numbering'
import { furcationSites, hasMgj } from '../domain/anatomy'
import { band, bandOf } from '../domain/bands'

export interface DictationResult {
  actions: Action[]
  message: string
  tone: 'ok' | 'err'
}

/**
 * Chairside shorthand — the same phrases a clinician says out loud while
 * probing, so a speech transcript can be piped straight in.
 */
export function runDictation(raw: string, chart: Chart, cursor: Cursor, numbering: Numbering): DictationResult | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  const ok = (message: string, ...actions: Action[]): DictationResult => ({ actions, message, tone: 'ok' })
  const err = (message: string): DictationResult => ({ actions: [], message, tone: 'err' })
  const label = (n: number) => toothLabel(n, numbering)
  let m: RegExpMatchArray | null

  if ((m = s.match(/^(?:tooth|number|#)\s*(\d{1,2})$/))) {
    const n = parseToothLabel(Number(m[1]), numbering)
    if (!n) return err(`No tooth ${m[1]}`)
    return ok(`→ tooth ${label(n)}`, { type: 'setCursor', at: { n, surf: cursor.surf, p: siteOrder(n)[1] }, row: 'pd' })
  }

  if ((m = s.match(/^(upper|maxillary|lower|mandibular)\s+(buccal|facial|palatal|lingual)$/))) {
    const up = /upper|maxill/.test(m[1])
    const surf: Surface = /buccal|facial/.test(m[2]) ? 'B' : 'L'
    const n = up === isUpper(cursor.n) ? cursor.n : up ? 3 : 30
    return ok(`→ ${band(bandOf(n, surf)).label}`, { type: 'setCursor', at: { n, surf, p: siteOrder(n)[1] }, row: 'pd' })
  }

  if ((m = s.match(/^(?:rec|recession|gm)\s*(-?\d)\s*(-?\d)\s*(-?\d)$/))) {
    const v = [Number(m[1]), Number(m[2]), Number(m[3])]
    return ok(`GM ${v.join(' ')} → ${label(cursor.n)}`, { type: 'applyTriplet', row: 'gm', values: v })
  }

  if ((m = s.match(/^(?:pd|probe|depth)?\s*(\d)\s*(\d)\s*(\d)$/))) {
    const v = [Number(m[1]), Number(m[2]), Number(m[3])]
    const where = cursor.surf === 'B' ? 'buccal' : isUpper(cursor.n) ? 'palatal' : 'lingual'
    return ok(`PD ${v.join(' ')} → ${label(cursor.n)} ${where}`,
      { type: 'applyTriplet', row: 'pd', values: v },
      { type: 'advance', step: 3 })
  }

  if ((m = s.match(/^(?:mob|mobility)\s*(\d)$/)))
    return ok(`Mobility ${m[1]} → ${label(cursor.n)}`, { type: 'setValue', row: 'mob', value: Math.min(3, Number(m[1])) })

  if ((m = s.match(/^(?:furc|furcation)\s*(\d)$/))) {
    if (!furcationSites(cursor.n, cursor.surf).includes(cursor.p)) return err('No furcation site here')
    return ok(`Furcation ${m[1]} → ${label(cursor.n)} ${cursor.p}`, { type: 'setValue', row: 'furc', value: Math.min(3, Number(m[1])) })
  }

  if ((m = s.match(/^mgj\s*(\d{1,2})$/))) {
    if (!hasMgj(cursor.n, cursor.surf)) return err('MGJ is not charted on this surface')
    return ok(`MGJ ${m[1]} → ${label(cursor.n)}`, { type: 'setValue', row: 'mgj', value: Number(m[1]) })
  }

  if ((m = s.match(/^gi\s*(\d)$/)))
    return ok(`Gingival index ${m[1]}`, { type: 'setValue', row: 'gi', value: Math.min(3, Number(m[1])) })

  const marks: Array<[RegExp, 'bop' | 'sup' | 'plq' | 'clc', string]> = [
    [/^(b|bleed|bleeding)$/, 'bop', 'Bleeding'],
    [/^(s|sup|suppuration|pus)$/, 'sup', 'Suppuration'],
    [/^(p|plaque)$/, 'plq', 'Plaque'],
    [/^(c|calc|calculus)$/, 'clc', 'Calculus'],
  ]
  for (const [re, row, name] of marks) {
    if (re.test(s)) return ok(`${name} → ${label(cursor.n)} ${cursor.p}`, { type: 'toggleMark', row, force: true })
  }

  if (/^(missing|extracted)$/.test(s)) return ok(`${label(cursor.n)} marked missing`, { type: 'setStatus', n: cursor.n, status: 'missing' })
  if (/^implant$/.test(s)) return ok(`${label(cursor.n)} marked implant`, { type: 'setStatus', n: cursor.n, status: 'implant' })
  if (/^(present|natural)$/.test(s)) return ok(`${label(cursor.n)} marked present`, { type: 'setStatus', n: cursor.n, status: 'present' })
  if (/^crown$/.test(s)) return ok(`${label(cursor.n)} crown toggled`, { type: 'toggleCrown', n: cursor.n })
  if (/^next$/.test(s)) return ok('→ next site', { type: 'advance', step: 1 })
  if (/^back$/.test(s)) return ok('→ previous site', { type: 'advance', step: -1 })

  return err(`Not understood: "${raw.trim()}"`)
}
