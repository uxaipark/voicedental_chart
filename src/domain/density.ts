/**
 * The arch has to fit whole. Rather than let a narrow screen cut it off, the
 * grid tightens: the site columns and the label gutter shrink together and the
 * tooth drawings scale with them, so the chart stays complete and legible on a
 * tablet instead of running off the side.
 *
 * One table drives both the CSS grid and the SVG, so the teeth cannot drift out
 * of step with the columns they sit under.
 */
export interface Density {
  id: 'comfortable' | 'compact' | 'tight'
  label: string
  hint: string
  /** width of one measurement site column */
  cw: number
  /** the row-label gutter */
  gut: number
  /** the midline gap */
  gap: number
}

export const DENSITIES: Density[] = [
  { id: 'comfortable', label: 'Comfortable', hint: 'Full size — a desktop monitor', cw: 18, gut: 124, gap: 22 },
  { id: 'compact', label: 'Compact', hint: 'Tighter columns — a large tablet', cw: 16, gut: 108, gap: 18 },
  { id: 'tight', label: 'Tight', hint: 'The whole arch on a narrow screen', cw: 14, gut: 96, gap: 14 },
]

export const archWidth = (d: Density) => d.gut + 48 * d.cw + d.gap
export const cardWidth = (d: Density) => archWidth(d) + 26
/** tooth column: three measurement sites */
export const toothColumn = (d: Density) => d.cw * 3

export const byId = (id: Density['id']) => DENSITIES.find((d) => d.id === id) ?? DENSITIES[0]

/** The widest density whose card still fits the room available. */
export function fitDensity(available: number): Density {
  return DENSITIES.find((d) => cardWidth(d) <= available) ?? DENSITIES[DENSITIES.length - 1]
}

export type DensityMode = 'auto' | Density['id']
