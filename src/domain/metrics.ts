import type { Chart, Surface } from './types'
import { ALL_TEETH, siteOrder } from './numbering'
import { furcationSites } from './anatomy'

export interface Metrics {
  sites: number
  teeth: number
  missing: number
  bopPct: number
  plqPct: number
  meanPd: string
  meanCal: string
  meanGi: string
  p4: number
  p5: number
  p6: number
  recessionSites: number
  supSites: number
  calcSites: number
  maxCal: number
  interCalMax: number
  extentPct: number
  furcation2: number[]
  mobility2: number[]
}

export function computeMetrics(chart: Chart): Metrics {
  let sites = 0, teeth = 0, missing = 0
  let bop = 0, plq = 0, clc = 0, sup = 0
  let pdSum = 0, calSum = 0, giSum = 0
  let p4 = 0, p5 = 0, p6 = 0, rec = 0, calSites = 0
  let maxCal = 0, interCalMax = 0
  const furc2: number[] = []
  const mob2: number[] = []

  for (const n of ALL_TEETH) {
    const t = chart[n]
    if (t.status === 'missing') { missing++; continue }
    teeth++
    if ((t.mobility ?? 0) >= 2) mob2.push(n)
    for (const surf of ['B', 'L'] as Surface[]) {
      const o = t[surf]
      for (const p of siteOrder(n)) {
        const pd = o.pd[p]
        if (pd == null) continue
        const gm = o.gm[p] ?? 0
        const cal = pd + gm
        sites++; pdSum += pd; calSum += cal; giSum += o.gi[p] ?? 0
        if (pd >= 4) p4++
        if (pd >= 5) p5++
        if (pd >= 6) p6++
        if (gm > 0) rec++
        if (o.bop[p]) bop++
        if (o.plq[p]) plq++
        if (o.clc[p]) clc++
        if (o.sup[p]) sup++
        if (cal > maxCal) maxCal = cal
        if (cal >= 3) calSites++
        if (p !== 'C' && cal > interCalMax) interCalMax = cal
      }
      for (const p of furcationSites(n, surf)) {
        if ((o.furc[p] ?? 0) >= 2 && !furc2.includes(n)) furc2.push(n)
      }
    }
  }
  const pct = (v: number) => (sites ? Math.round((v / sites) * 100) : 0)
  const avg = (v: number) => (sites ? (v / sites).toFixed(1) : '0.0')
  return {
    sites, teeth, missing,
    bopPct: pct(bop), plqPct: pct(plq),
    meanPd: avg(pdSum), meanCal: avg(calSum), meanGi: avg(giSum),
    p4, p5, p6,
    recessionSites: rec, supSites: sup, calcSites: clc,
    maxCal, interCalMax,
    extentPct: pct(calSites),
    furcation2: furc2, mobility2: mob2,
  }
}

/** AAP / EFP 2017 stage, suggested from severity plus complexity. */
export function suggestStage(m: Metrics): 1 | 2 | 3 | 4 {
  let s: 1 | 2 | 3 | 4 = m.interCalMax >= 5 ? 3 : m.interCalMax >= 3 ? 2 : 1
  if (s >= 3 && (m.p6 > 0 || m.furcation2.length > 0)) s = 3
  // Stage IV is driven by tooth loss and mobility, not by depth alone.
  if (m.mobility2.length >= 1 || m.missing >= 5) s = 4
  return s
}

export const STAGE_LABEL = ['I', 'II', 'III', 'IV'] as const

export interface Finding {
  n: number
  surf: Surface
  p: 'M' | 'C' | 'D'
  rank: number
  text: string
  severity: 'crit' | 'warn' | 'info'
}

export function collectFindings(chart: Chart): Finding[] {
  const out: Finding[] = []
  for (const n of ALL_TEETH) {
    const t = chart[n]
    if (t.status === 'missing') continue
    for (const surf of ['B', 'L'] as Surface[]) {
      const o = t[surf]
      const sl = surf === 'B' ? 'B' : n <= 16 ? 'P' : 'L'
      for (const p of siteOrder(n)) {
        const pd = o.pd[p]
        if (!pd) continue
        const cal = pd + (o.gm[p] ?? 0)
        const why: string[] = []
        if (pd >= 6) why.push(`PD ${pd} mm`)
        if (o.sup[p]) why.push('suppuration')
        if (cal >= 6) why.push(`CAL ${cal} mm`)
        if (!why.length) continue
        out.push({ n, surf, p, rank: pd, text: `${sl}-${p} · ${why.join(', ')}`, severity: pd >= 8 || o.sup[p] ? 'crit' : 'warn' })
      }
      for (const p of furcationSites(n, surf)) {
        const v = o.furc[p] ?? 0
        if (v >= 2) out.push({ n, surf, p, rank: 7, text: `${sl}-${p} · furcation ${['0', 'I', 'II', 'III'][v]}`, severity: 'crit' })
      }
    }
    if ((t.mobility ?? 0) >= 2) out.push({ n, surf: 'B', p: 'C', rank: 6, text: `mobility ${t.mobility}`, severity: 'crit' })
    if (t.note) out.push({ n, surf: 'B', p: 'C', rank: 5, text: `note · ${t.note}`, severity: 'info' })
  }
  return out.sort((a, b) => b.rank - a.rank)
}
