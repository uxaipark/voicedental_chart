import type { Numbering, Pos } from './types'

export const UPPER: number[] = Array.from({ length: 16 }, (_, i) => i + 1)
export const LOWER: number[] = Array.from({ length: 16 }, (_, i) => 32 - i)
export const ALL_TEETH: number[] = Array.from({ length: 32 }, (_, i) => i + 1)

export const isUpper = (n: number) => n <= 16

const FDI: Record<number, number> = {
  1: 18, 2: 17, 3: 16, 4: 15, 5: 14, 6: 13, 7: 12, 8: 11,
  9: 21, 10: 22, 11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
  17: 38, 18: 37, 19: 36, 20: 35, 21: 34, 22: 33, 23: 32, 24: 31,
  25: 41, 26: 42, 27: 43, 28: 44, 29: 45, 30: 46, 31: 47, 32: 48,
}

const QUADS = ['UR', 'UL', 'LL', 'LR'] as const

export function toothLabel(n: number, sys: Numbering): string {
  if (sys === 'fdi') return String(FDI[n])
  if (sys === 'palmer') {
    const f = FDI[n]
    return QUADS[Math.floor(f / 10) - 1] + (f % 10)
  }
  return String(n)
}

/** Universal number for a label typed in the active numbering system. */
export function parseToothLabel(raw: number, sys: Numbering): number | null {
  if (sys === 'fdi') {
    const hit = Object.keys(FDI).find((k) => FDI[Number(k)] === raw)
    return hit ? Number(hit) : null
  }
  return raw >= 1 && raw <= 32 ? raw : null
}

/**
 * Site order as it reads left to right on screen. Mesial points toward the
 * midline, so the triplet mirrors at the midline of each arch.
 */
export function siteOrder(n: number): Pos[] {
  const mesialRight = (n >= 1 && n <= 8) || (n >= 25 && n <= 32)
  return mesialRight ? ['D', 'C', 'M'] : ['M', 'C', 'D']
}

export const POS_NAME: Record<Pos, string> = { M: 'Mesial', C: 'Mid', D: 'Distal' }

export function surfaceName(n: number, surf: 'B' | 'L'): string {
  return surf === 'B' ? 'Buccal' : isUpper(n) ? 'Palatal' : 'Lingual'
}
