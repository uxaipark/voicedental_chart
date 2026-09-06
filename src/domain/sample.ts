import type { Chart, Pos, Surface } from './types'
import { emptyTooth } from './types'
import { ALL_TEETH, siteOrder } from './numbering'
import { MANDIBULAR_MOLARS, MAXILLARY_MOLARS, furcationSites, hasMgj } from './anatomy'

/**
 * A deterministic demonstration exam so the chart opens in a working state.
 * Generalized periodontitis across all 32 teeth, partially erupted third
 * molars and an implant at #19. Not a patient record.
 */
export function sampleChart(): Chart {
  const chart: Chart = {}
  for (const n of ALL_TEETH) chart[n] = emptyTooth(n)

  let seed = 20260906
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const pick = (w: Array<[number, number]>) => {
    const r = rnd()
    let a = 0
    for (const [v, p] of w) { a += p; if (r < a) return v }
    return w[w.length - 1][0]
  }

  chart[19].status = 'implant'
  for (const k of [3, 14, 30, 20]) chart[k].crown = true

  for (const n of ALL_TEETH) {
    const t = chart[n]
    const molar = MAXILLARY_MOLARS.includes(n) || MANDIBULAR_MOLARS.includes(n)
    const premolar = [4, 5, 12, 13, 20, 21, 28, 29].includes(n)
    for (const surf of ['B', 'L'] as Surface[]) {
      const o = t[surf]
      for (const p of siteOrder(n)) {
        const inter = p !== 'C'
        const base = molar ? (inter ? 4 : 3) : premolar ? 3 : inter ? 3 : 2
        let pd = base + pick([[0, 0.42], [1, 0.24], [-1, 0.26], [2, 0.08]])
        if (surf === 'L' && molar) pd += pick([[0, 0.72], [1, 0.28]])
        pd = Math.max(1, Math.min(11, pd))
        const rec = molar || premolar
          ? pick([[0, 0.52], [1, 0.28], [2, 0.15], [3, 0.05]])
          : pick([[0, 0.62], [1, 0.24], [2, 0.1], [-1, 0.04]])
        o.pd[p] = pd
        o.gm[p] = rec
        const bleeds = pd >= 5 ? rnd() < 0.82 : pd === 4 ? rnd() < 0.55 : rnd() < 0.18
        if (bleeds) o.bop[p] = true
        if (pd >= 6 && rnd() < 0.3) o.sup[p] = true
        if (rnd() < 0.34) o.plq[p] = true
        if (pd >= 4 && rnd() < 0.46) o.clc[p] = true
        const gi = bleeds ? pick([[2, 0.6], [3, 0.4]]) : pick([[0, 0.55], [1, 0.45]])
        if (gi) o.gi[p] = gi
      }
      if (hasMgj(n, surf)) {
        o.mgj.C = Math.max(0, (molar ? 4 : n >= 22 && n <= 27 ? 2 : 3) + pick([[0, 0.6], [1, 0.25], [-1, 0.15]]))
      }
      for (const p of furcationSites(n, surf)) o.furc[p] = pick([[0, 0.3], [1, 0.32], [2, 0.3], [3, 0.08]])
    }
    t.mobility = molar ? pick([[0, 0.5], [1, 0.36], [2, 0.14]]) : pick([[0, 0.78], [1, 0.2], [2, 0.02]])
  }

  // Deliberate findings so the chart reads like a real case.
  const hot = (n: number, surf: Surface, p: Pos, pd: number, gm: number, furc?: number) => {
    const o = chart[n][surf]
    o.pd[p] = pd; o.gm[p] = gm; o.bop[p] = true; o.gi[p] = 3
    if (furc !== undefined) o.furc[p] = furc
  }
  hot(30, 'B', 'D', 9, 3, 2); hot(30, 'B', 'M', 8, 3); hot(30, 'L', 'D', 8, 4, 2)
  chart[30].mobility = 1; chart[30].note = 'Endo-perio, distal'
  hot(3, 'B', 'D', 8, 3, 2); hot(3, 'L', 'D', 7, 3, 2); hot(3, 'L', 'M', 7, 2, 1)
  hot(14, 'B', 'D', 7, 2, 2); hot(14, 'L', 'D', 8, 3, 3)
  chart[14].mobility = 1; chart[14].note = 'Class III furcation, guarded'
  hot(31, 'B', 'D', 7, 2, 1); hot(31, 'L', 'C', 6, 2, 1)

  // Partially erupted third molars keep their distal pockets.
  chart[1].note = 'Partial eruption, distal pocket'
  hot(1, 'B', 'D', 6, 1, 1); hot(1, 'L', 'D', 6, 1)
  hot(16, 'B', 'D', 6, 2, 1); hot(32, 'B', 'D', 6, 1); hot(17, 'L', 'D', 6, 1)

  chart[6].recClass = 'Miller I'
  chart[27].recClass = 'Cairo RT1'
  chart[22].recClass = 'Miller II'

  const imp = chart[19]
  imp.B.pd = { M: 5, C: 4, D: 5 }; imp.B.gm = { M: 2, C: 2, D: 2 }
  imp.L.pd = { M: 5, C: 4, D: 6 }; imp.L.gm = { M: 2, C: 2, D: 3 }
  imp.B.bop = { M: true, D: true }; imp.L.bop = { D: true }
  imp.B.furc = {}; imp.L.furc = {}
  imp.mobility = 0
  imp.note = 'Peri-implantitis, re-eval 6 wk'

  return chart
}
