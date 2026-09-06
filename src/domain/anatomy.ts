import type { Pos, Surface } from './types'
import { isUpper, siteOrder } from './numbering'

export const MAXILLARY_MOLARS = [1, 2, 3, 14, 15, 16]
export const MANDIBULAR_MOLARS = [17, 18, 19, 30, 31, 32]
export const MAXILLARY_FIRST_PREMOLARS = [5, 12]
const PREMOLARS = [4, 5, 12, 13, 20, 21, 28, 29]
const CANINES = [6, 11, 22, 27]

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor'

export interface Anatomy {
  type: ToothType
  /** number of roots visible in a facial / lingual view */
  roots: number
  /** crown width, px at the chart's 54 px column */
  cw: number
  /** crown height from the CEJ to the occlusal or incisal edge */
  ch: number
  /** root length from the CEJ to the apex */
  rl: number
  /** cervical width at the CEJ */
  cerv: number
  /**
   * How prominent the lingual cingulum is: 0 on any facial aspect, ~1 on a
   * maxillary anterior, and much slighter on a mandibular one, where the
   * lingual surface is nearly smooth.
   */
  cingulum: number
  /** maxillary molars: the palatal root is nearest the viewer from the palatal */
  palatalRootInFront: boolean
}

/**
 * The two aspects of a tooth are not the same shape.
 *
 * Anterior crowns converge lingually, so they are narrower from behind and
 * carry a cingulum in the cervical third. A maxillary premolar's palatal cusp
 * is shorter than its buccal cusp, and a mandibular first premolar's lingual
 * cusp is barely functional — from the lingual that crown is two thirds the
 * height. Mandibular molars are the other way round: the lingual cusps are the
 * taller pair. And on a maxillary molar the palatal root is the one nearest
 * the viewer from the palatal, so it is drawn in front rather than behind.
 */
function lingualForm(n: number, a: Anatomy): Anatomy {
  const upper = isUpper(n)
  if (a.type === 'incisor' || a.type === 'canine') {
    return { ...a, cw: a.cw * (upper ? 0.88 : 0.9), ch: a.ch * 0.98, cerv: a.cerv * 0.96, cingulum: upper ? 1 : 0.55 }
  }
  if (a.type === 'premolar') {
    if (n === 21 || n === 28) return { ...a, cw: a.cw * 0.86, ch: a.ch * 0.66 } // mandibular first premolar
    if (upper) return { ...a, cw: a.cw * 0.92, ch: a.ch * 0.86 }
    return { ...a, cw: a.cw * 0.94, ch: a.ch * 0.9 }
  }
  if (upper) return { ...a, cw: a.cw * 0.94, palatalRootInFront: true }
  return { ...a, cw: a.cw * 0.92, ch: a.ch * 1.06 }
}

const cache = new Map<string, Anatomy>()

export function anatomy(n: number, surf: Surface = 'B'): Anatomy {
  const key = `${n}|${surf}`
  const hit = cache.get(key)
  if (hit) return hit
  const base = { cingulum: 0, palatalRootInFront: false }
  let a: Anatomy
  if (MAXILLARY_MOLARS.includes(n) || MANDIBULAR_MOLARS.includes(n)) {
    const third = n === 1 || n === 16 || n === 17 || n === 32
    const first = n === 3 || n === 14 || n === 19 || n === 30
    const cw = third ? 33 : first ? 39 : 36
    a = { ...base, type: 'molar', roots: MAXILLARY_MOLARS.includes(n) ? 3 : 2, cw, ch: 25, rl: third ? 38 : 44, cerv: cw * 0.82 }
  } else if (PREMOLARS.includes(n)) {
    a = { ...base, type: 'premolar', roots: MAXILLARY_FIRST_PREMOLARS.includes(n) ? 2 : 1, cw: 26, ch: 27, rl: isUpper(n) ? 47 : 50, cerv: 26 * 0.8 }
  } else if (CANINES.includes(n)) {
    const cw = isUpper(n) ? 25 : 23
    a = { ...base, type: 'canine', roots: 1, cw, ch: isUpper(n) ? 36 : 35, rl: isUpper(n) ? 60 : 57, cerv: cw * 0.74 }
  } else {
    const central = n === 8 || n === 9 || n === 24 || n === 25
    const cw = isUpper(n) ? (central ? 26 : 21) : central ? 17 : 19
    a = { ...base, type: 'incisor', roots: 1, cw, ch: isUpper(n) ? 34 : 30, rl: isUpper(n) ? (central ? 49 : 47) : 45, cerv: cw * 0.72 }
  }
  if (surf === 'L') a = lingualForm(n, a)
  cache.set(key, a)
  return a
}

/** Cusp tips visible on this surface — what actually shapes the occlusal outline. */
export function cuspCount(n: number, surf: Surface): number {
  if (MAXILLARY_MOLARS.includes(n)) return 2
  if (MANDIBULAR_MOLARS.includes(n)) return (n === 19 || n === 30) && surf === 'B' ? 3 : 2
  if (PREMOLARS.includes(n)) return surf === 'L' && (n === 20 || n === 29) ? 2 : 1
  if (CANINES.includes(n)) return 1
  return 0
}

/**
 * Glickman furcations that exist on this surface. Maxillary molars have a
 * buccal plus two palatal entrances, mandibular molars buccal and lingual,
 * maxillary first premolars mesial and distal.
 */
export function furcationSites(n: number, surf: Surface): Pos[] {
  if (MAXILLARY_MOLARS.includes(n)) return surf === 'B' ? ['C'] : ['M', 'D']
  if (MANDIBULAR_MOLARS.includes(n)) return ['C']
  if (MAXILLARY_FIRST_PREMOLARS.includes(n) && surf === 'B') return ['M', 'D']
  return []
}

/** There is no maxillary palatal mucogingival junction to measure. */
export function hasMgj(n: number, surf: Surface): boolean {
  return surf === 'B' || !isUpper(n)
}

/** Distal direction on screen: -1 when the distal site sits to the left. */
export function distalSign(n: number): number {
  return siteOrder(n)[0] === 'D' ? -1 : 1
}
