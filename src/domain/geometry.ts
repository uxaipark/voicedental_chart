/**
 * Tooth drawing, kept as pure functions outside React.
 *
 * Every path is derived from the tooth's anatomy, so the geometry never
 * changes while an exam is being recorded — it is generated once, cached by
 * tooth and surface, and the measurement layers redraw over the top of it.
 *
 * The look is a 3D dental model rather than an icon: all-bezier silhouettes,
 * a lobed cylindrical light wrap so each cusp shows as its own volume,
 * translucent enamel over the incisal third, developmental grooves, ambient
 * occlusion at the cervical and a specular on the buccal bulge.
 */
import type { Anatomy } from './anatomy'
import { anatomy, cuspCount, distalSign } from './anatomy'
import type { Surface } from './types'

export const COL = 54
export const SITE = 18
export const BAND_H = 112
export const CEJ_UP = 72
export const CEJ_DOWN = 40
export const MM = 3.3
export const HALF_W = COL * 8

type Cmd = string | number
const fx = (v: Cmd) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v)
const joinP = (d: Cmd[]) => d.map(fx).join(' ')

/** CEJ curves occlusally toward the proximals; it meets 0 mm at the mid-facial. */
const scallop = (a: Anatomy) => (a.type === 'incisor' || a.type === 'canine' ? 2.8 : 1.8)
const occStart = (cusps: number) => (cusps === 0 ? 0.8 : 0.72)

function occlusalEdge(cusps: number, bw: number, h: number, sharp: boolean): Cmd[] {
  const d: Cmd[] = []
  if (cusps === 0) {
    d.push('C', -bw * 0.972, h * 0.905, -bw * 0.905, h * 0.996, -bw * 0.7, h * 0.998)
    d.push('Q', 0, h * 1.014, bw * 0.7, h * 0.998)
    d.push('C', bw * 0.905, h * 0.996, bw * 0.972, h * 0.905, bw * 0.93, h * 0.8)
    return d
  }
  if (cusps === 1) {
    const k = sharp ? 0.58 : 0.7
    const t = sharp ? 0.955 : 0.975
    d.push('C', -bw * k, h * 0.855, -bw * 0.23, h * t, 0, h)
    d.push('C', bw * 0.23, h * t, bw * k, h * 0.855, bw * 0.93, h * 0.72)
    return d
  }
  const x0 = -bw * 0.79
  const span = bw * 1.58
  const lw = span / (cusps - 1)
  const tips = Array.from({ length: cusps }, (_, i) => x0 + i * lw)
  d.push('C', -bw * 0.905, h * 0.875, tips[0] - lw * 0.33, h * 0.995, tips[0], h)
  for (let j = 1; j < cusps; j++) {
    const v = (tips[j - 1] + tips[j]) / 2
    d.push('C', tips[j - 1] + lw * 0.29, h, v - lw * 0.17, h * 0.848, v, h * 0.852)
    d.push('C', v + lw * 0.17, h * 0.848, tips[j] - lw * 0.29, h, tips[j], h)
  }
  d.push('C', tips[cusps - 1] + lw * 0.33, h * 0.995, bw * 0.905, h * 0.875, bw * 0.93, h * 0.72)
  return d
}

export function crownPath(a: Anatomy, cusps: number, sc = scallop(a)): string {
  const h = a.ch
  const bw = a.cw / 2
  const oc = occStart(cusps)
  const d: Cmd[] = ['M', -a.cerv / 2, sc]
  d.push('C', -bw * 0.93, h * 0.19, -bw * 1.005, h * 0.48, -bw * 0.93, h * oc)
  d.push(...occlusalEdge(cusps, bw, h, a.type === 'canine'))
  d.push('C', bw * 1.005, h * 0.48, bw * 0.93, h * 0.19, a.cerv / 2, sc)
  d.push('Q', 0, -sc, -a.cerv / 2, sc, 'Z')
  return joinP(d)
}

/** Enamel shell: the occlusal outline closed by the dentino-enamel junction. */
export function enamelCap(a: Anatomy, cusps: number): string {
  const h = a.ch
  const bw = a.cw / 2
  const oc = occStart(cusps)
  const dy = cusps === 0 ? 0.44 : 0.5
  const mid = dy + (cusps >= 2 ? 0.1 : 0.16)
  const d: Cmd[] = ['M', -bw * 0.93, h * oc]
  d.push(...occlusalEdge(cusps, bw, h, a.type === 'canine'))
  d.push('C', bw * 0.78, h * (dy + 0.09), bw * 0.38, h * mid, 0, h * mid)
  d.push('C', -bw * 0.38, h * (dy + 0.09), -bw * 0.78, h * (dy + 0.09), -bw * 0.93, h * oc, 'Z')
  return joinP(d)
}

export interface Groove { d: string; o: number }

/** Developmental grooves read as relief at chart scale where fine detail cannot. */
export function groovePaths(a: Anatomy, cusps: number): Groove[] {
  const h = a.ch
  const bw = a.cw / 2
  const out: Groove[] = []
  if (cusps >= 2) {
    const x0 = -bw * 0.79
    const lw = (bw * 1.58) / (cusps - 1)
    for (let j = 1; j < cusps; j++) {
      const v = x0 + (j - 0.5) * lw
      out.push({ d: joinP(['M', v, h * 0.845, 'C', v * 1.03, h * 0.6, v * 0.92, h * 0.42, v * 0.8, h * 0.26]), o: 0.17 })
    }
  } else if (cusps === 0) {
    for (const f of [-0.26, 0.26]) {
      const x = bw * f
      out.push({ d: joinP(['M', x, h * 0.965, 'C', x * 1.05, h * 0.78, x * 0.95, h * 0.66, x * 0.86, h * 0.56]), o: 0.1 })
    }
  }
  return out
}

/**
 * The cingulum — the convex bulge that fills the cervical third of every
 * anterior lingual surface, and the only part of that aspect that catches a
 * highlight the way a facial surface does.
 */
export function cingulumPath(a: Anatomy): string {
  const bw = a.cw / 2
  const h = a.ch
  const k = a.cingulum // a mandibular cingulum sits lower and reaches less far
  const top = h * (0.30 + 0.14 * k)
  return joinP([
    'M', -bw * 0.52, h * 0.04,
    'C', -bw * (0.50 + 0.08 * k), h * 0.26, -bw * 0.36, top, 0, top,
    'C', bw * 0.36, top, bw * (0.50 + 0.08 * k), h * 0.26, bw * 0.52, h * 0.04,
    'Z',
  ])
}

/** Marginal ridges run from the cingulum to the incisal angles, framing the fossa. */
export function marginalRidges(a: Anatomy): string[] {
  const bw = a.cw / 2
  const h = a.ch
  return [1, -1].map((sx) =>
    joinP([
      'M', sx * bw * 0.50, h * 0.20,
      'C', sx * bw * 0.68, h * 0.50, sx * bw * 0.74, h * 0.74, sx * bw * 0.76, h * 0.94,
    ]),
  )
}

export interface Root { d: string; back: boolean }

export function rootPaths(a: Anatomy, sc: number, distal: number, frontRoot = false): Root[] {
  const w = a.cerv
  const rl = a.rl
  let offs: number[]
  let rws: number[]
  let backIdx = -1
  if (a.roots === 1) {
    offs = [0]
    rws = [w * 0.82]
  } else if (a.roots === 2) {
    offs = [-w * 0.27, w * 0.27]
    rws = [w * 0.43, w * 0.43]
  } else {
    offs = [-w * 0.36, 0, w * 0.36]
    rws = [w * 0.3, frontRoot ? w * 0.46 : w * 0.4, w * 0.3]
    backIdx = 1
  }
  const out: Root[] = []
  for (let k = 0; k < a.roots; k++) {
    const ox = offs[k]
    const rw = rws[k]
    const splay =
      a.roots === 1 ? 0 : a.roots === 3 ? (k === 1 ? 0 : k === 0 ? -rl * 0.17 : rl * 0.17) : ox < 0 ? -rl * 0.13 : rl * 0.13
    const drift = distal * rl * (a.roots === 1 ? 0.12 : 0.05)
    const len = a.roots === 3 ? (k === 1 ? rl * 1.14 : rl * 0.9) : a.roots === 2 ? rl * 0.98 : rl
    const tipx = ox + splay + drift
    const top = sc * 0.9
    out.push({
      back: k === backIdx,
      d: joinP([
        'M', ox - rw / 2, top,
        'C', ox - rw * 0.5, -len * 0.33, tipx - rw * 0.36, -len * 0.72, tipx - rw * 0.11, -len * 0.955,
        'Q', tipx, -len * 1.01, tipx + rw * 0.11, -len * 0.955,
        'C', tipx + rw * 0.36, -len * 0.72, ox + rw * 0.5, -len * 0.33, ox + rw / 2, top, 'Z',
      ]),
    })
  }
  if (backIdx >= 0) {
    const palatal = out.splice(backIdx, 1)[0]
    // From the palatal aspect that root is the one nearest the viewer.
    if (frontRoot) { palatal.back = false; out.push(palatal) } else out.unshift(palatal)
  }
  return out
}

export interface ToothShape {
  crown: string
  cap: string
  grooves: Groove[]
  roots: Root[]
  cusps: number
  /** anterior lingual only */
  cingulum?: string
  ridges?: string[]
  /** crown + every root as one path, used for the cast shadow */
  silhouette: string
}

const shapeCache = new Map<string, ToothShape>()

export function toothShape(n: number, surf: Surface): ToothShape {
  const key = `${n}|${surf}`
  const hit = shapeCache.get(key)
  if (hit) return hit
  const a = anatomy(n, surf)
  const cusps = cuspCount(n, surf)
  const sc = scallop(a)
  const crown = crownPath(a, cusps, sc)
  const roots = rootPaths(a, sc, distalSign(n), a.palatalRootInFront)
  const shape: ToothShape = {
    crown,
    cap: enamelCap(a, cusps),
    grooves: groovePaths(a, cusps),
    roots,
    cusps,
    cingulum: a.cingulum > 0 ? cingulumPath(a) : undefined,
    ridges: a.cingulum > 0 ? marginalRidges(a) : undefined,
    silhouette: [crown, ...roots.map((r) => r.d)].join(' '),
  }
  shapeCache.set(key, shape)
  return shape
}

/** Implant fixture, drawn instead of roots. */
export function implantShape(n: number, surf: Surface) {
  const a = anatomy(n, surf)
  const w = a.cerv * 0.58
  const rl = a.rl * 0.84
  const body = `M ${fx(-w / 2)} 5 L ${fx(-w * 0.38)} ${fx(-rl)} Q 0 ${fx(-rl - 5)} ${fx(w * 0.38)} ${fx(-rl)} L ${fx(w / 2)} 5 Z`
  const threads: Array<[number, number, number, number]> = []
  for (let y = -5; y > -rl; y -= 4.4) {
    const f = 1 - (Math.abs(y) / rl) * 0.22
    threads.push([-(w / 2) * f, y, (w / 2) * f, y + 2.1])
  }
  const ca: Anatomy = { ...a, cw: a.cw * 0.9, cerv: a.cerv * 0.84 }
  const cusps = cuspCount(n, surf)
  // The crown sits where a natural crown sits. Any extra drop would push a
  // canine or central incisor past the bottom of the band.
  const crownDy = 2
  return {
    body,
    threads,
    abutment: { x: -a.cerv * 0.27, w: a.cerv * 0.54, y: -2, h: 7 },
    crown: crownPath(ca, cusps, 1.4),
    cap: enamelCap(ca, cusps),
    crownDy,
    cusps,
  }
}

/* ---------- lighting ramps ---------------------------------------------- */

export interface Stop { offset: number; color: string; opacity: number }

const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2))

/**
 * Sample a continuous lighting curve instead of placing stops by hand.
 * Evenly spaced samples of a smooth function cannot band or stripe.
 */
function sampleRamp(fn: (x: number) => number, hi: number, sh: number, n = 28): Stop[] {
  const out: Stop[] = []
  for (let i = 0; i <= n; i++) {
    const x = i / n
    const v = Math.max(-1, Math.min(1, fn(x)))
    out.push({
      offset: Math.round(x * 1000) / 1000,
      color: v >= 0 ? '#fff' : '#000',
      opacity: Math.round((v >= 0 ? v * hi : -v * sh) * 1000) / 1000,
    })
  }
  return out
}

const lobePeaks = (cusps: number) =>
  cusps <= 0 ? [0.33] : cusps === 1 ? [0.35] : cusps === 2 ? [0.27, 0.72] : [0.19, 0.5, 0.81]

/**
 * A facial surface is convex and a lingual surface is hollow, so the two take
 * opposite lighting. On the convex aspect the middle of the crown carries the
 * highlight and the far side falls into a core shadow. On the concave aspect
 * that inverts: the marginal ridges catch the light, the fossa between them
 * pools shade, and the far inner wall — the one actually turned toward the
 * light — is the bright part. Reading them the same way is what makes a
 * lingual view look like a facial view drawn slightly narrower.
 */
export function lobeRamp(cusps: number, concave = false): Stop[] {
  const peaks = lobePeaks(cusps)
  if (concave) {
    const amp = cusps >= 2 ? 0.12 : 0.09
    const sg = cusps >= 2 ? 0.15 : 0.26
    return sampleRamp(
      (x) => {
        let v = -Math.cos(((x - 0.34) * Math.PI) / 0.55) * 0.44 // inverted cylinder: fossa dark, far wall lit
        v += 0.34 * bell(x, 0.055, 0.055) // near marginal ridge
        v += 0.18 * bell(x, 0.95, 0.045) // far marginal ridge, dimmer
        v -= 0.16 * bell(x, 0.3, 0.13) // deepen the shaded wall of the fossa
        v -= 0.3 * bell(x, 0.995, 0.028) // the far rim turns away again
        for (const px of peaks) v += amp * bell(x, px, sg) // lingual cusps still swell, gently
        return v
      },
      0.34,
      0.3,
    )
  }
  const amp = cusps >= 2 ? 0.2 : 0.17
  const sg = cusps >= 2 ? 0.13 : 0.24
  return sampleRamp(
    (x) => {
      let v = Math.cos(((x - 0.3) * Math.PI) / 0.55) * 0.72 // cylinder: lit at .30, core shadow at .85
      for (const px of peaks) v += amp * bell(x, px, sg) // each cusp its own soft swell
      v += 0.42 * bell(x, 0.975, 0.045) // reflected light on the far rim
      v -= 0.3 * bell(x, 0.01, 0.035) // near rim turns away from the light
      return v
    },
    0.42,
    0.26,
  )
}

export function rootRamp(): Stop[] {
  return sampleRamp(
    (x) => Math.cos(((x - 0.32) * Math.PI) / 0.56) * 0.78 + 0.38 * bell(x, 0.97, 0.05) - 0.26 * bell(x, 0.015, 0.04),
    0.46,
    0.26,
  )
}

export function enamelRamp(): Stop[] {
  return [
    { offset: 0, color: '#fff', opacity: 0 },
    { offset: 0.55, color: '#fff', opacity: 0.11 },
    { offset: 1, color: '#fff', opacity: 0.38 },
  ]
}
