import { memo, useMemo } from 'react'
import type { ReactElement } from 'react'
import type { Band } from '../domain/bands'
import type { Chart } from '../domain/types'
import type { Action } from '../state/chartReducer'
import { BAND_H, CEJ_DOWN, CEJ_UP, COL, HALF_W, MM, SITE, enamelRamp, lobeRamp, rootRamp, toothShape } from '../domain/geometry'
import { siteOrder } from '../domain/numbering'
import { anatomy, furcationSites } from '../domain/anatomy'
import { Tooth } from './Tooth'

interface Props {
  band: Band
  teeth: number[]
  chart: Chart
  gradKey: string
  dispatch?: (a: Action) => void
}

const Ramp = ({ id, horizontal, stops }: { id: string; horizontal: boolean; stops: ReturnType<typeof rootRamp> }) => (
  <linearGradient id={id} x1="0" y1="0" x2={horizontal ? 1 : 0} y2={horizontal ? 0 : 1}>
    {stops.map((s, i) => (
      <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
    ))}
  </linearGradient>
)

function Defs({ k, concave }: { k: string; concave: boolean }) {
  const lobes = useMemo(() => [0, 1, 2, 3].map((c) => lobeRamp(c, concave)), [concave])
  return (
    <defs>
      <linearGradient id={`en${k}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--enamel-2)" />
        <stop offset="0.22" stopColor="var(--enamel-2)" />
        <stop offset="1" stopColor="var(--enamel)" />
      </linearGradient>
      <linearGradient id={`rt${k}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--root)" />
        <stop offset="0.72" stopColor="var(--root-2)" />
        <stop offset="1" stopColor="var(--root-2)" />
      </linearGradient>
      <Ramp id={`rcy${k}`} horizontal stops={rootRamp()} />
      <Ramp id={`enm${k}`} horizontal={false} stops={enamelRamp()} />
      {/* broad sheen: the crest of the facial bulge, or the lit far wall of the fossa */}
      <radialGradient id={`spc${k}`} cx={concave ? '.62' : '.33'} cy={concave ? '.56' : '.44'} r={concave ? '.40' : '.38'}>
        <stop offset="0" stopColor="#fff" stopOpacity={concave ? '.20' : '.32'} />
        <stop offset=".55" stopColor="#fff" stopOpacity={concave ? '.06' : '.09'} />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      {/* tight gleam: on a hollow surface it belongs on the cingulum, not mid-crown */}
      <radialGradient
        id={`gls${k}`}
        cx={concave ? '.44' : '.29'} cy={concave ? '.16' : '.27'} r={concave ? '.24' : '.30'}
        fx={concave ? '.42' : '.26'} fy={concave ? '.13' : '.22'}
      >
        <stop offset="0" stopColor="#fff" stopOpacity={concave ? '.52' : '.82'} />
        <stop offset=".38" stopColor="#fff" stopOpacity={concave ? '.18' : '.30'} />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <filter id={`shd${k}`} x="-14%" y="-14%" width="128%" height="128%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
      {lobes.map((stops, c) => (
        <Ramp key={c} id={`lb${k}${c}`} horizontal stops={stops} />
      ))}
    </defs>
  )
}

/** The millimetre rule the pocket graph is read against. */
const Rule = memo(function Rule({ cy, dir }: { cy: number; dir: number }) {
  const lines: ReactElement[] = []
  for (let mm = -4; mm <= 14; mm++) {
    const y = cy + dir * mm * MM
    if (y < 1 || y > BAND_H - 1) continue
    const strong = mm % 5 === 0
    lines.push(
      <line key={mm} x1={0} y1={y} x2={HALF_W} y2={y}
            stroke={strong ? 'var(--rule-5)' : 'var(--rule)'} strokeWidth={strong ? 0.9 : 0.6} />,
    )
  }
  return <g pointerEvents="none">{lines}</g>
})

/** Gingival margin and attachment level, with the pocket band between them. */
function PocketGraph({ band, teeth, chart, cy, dir }: Props & { cy: number; dir: number }) {
  const runs = useMemo(() => {
    const out: Array<Array<{ x: number; gy: number; py: number; bop: boolean; sup: boolean }>> = []
    let run: (typeof out)[number] = []
    teeth.forEach((n, i) => {
      const t = chart[n]
      if (t.status === 'missing') { if (run.length) { out.push(run); run = [] } return }
      siteOrder(n).forEach((p, k) => {
        const pd = t[band.surf].pd[p]
        if (pd == null) { if (run.length) { out.push(run); run = [] } return }
        const gm = t[band.surf].gm[p] ?? 0
        run.push({
          x: i * COL + (k + 0.5) * SITE,
          gy: cy + dir * gm * MM,
          py: cy + dir * (gm + pd) * MM,
          bop: !!t[band.surf].bop[p],
          sup: !!t[band.surf].sup[p],
        })
      })
    })
    if (run.length) out.push(run)
    return out
  }, [band.surf, teeth, chart, cy, dir])

  return (
    <g pointerEvents="none">
      {runs.map((r, i) => {
        const gl = r.map((q) => `${q.x.toFixed(1)},${q.gy.toFixed(1)}`).join(' ')
        const pl = r.map((q) => `${q.x.toFixed(1)},${q.py.toFixed(1)}`).join(' ')
        const poly = `${gl} ${[...r].reverse().map((q) => `${q.x.toFixed(1)},${q.py.toFixed(1)}`).join(' ')}`
        return (
          <g key={i}>
            <polygon points={poly} fill="var(--pd-fill)" />
            <polyline points={pl} fill="none" stroke="var(--cal-line)" strokeWidth={1.5} strokeLinejoin="round" />
            <polyline points={gl} fill="none" stroke="var(--gum)" strokeWidth={1.9} strokeLinejoin="round" />
            {r.map((q, j) => (
              <g key={j}>
                {q.sup && <circle cx={q.x} cy={q.py} r={4.3} fill="none" stroke="var(--sup)" strokeWidth={1.4} />}
                {q.bop && <circle cx={q.x} cy={q.py} r={2.4} fill="var(--bop)" />}
              </g>
            ))}
          </g>
        )
      })}
    </g>
  )
}

/** Glickman furcation triangles, placed on the root trunk. */
function FurcationMarks({ band, teeth, chart, cy, dir }: Props & { cy: number; dir: number }) {
  const marks: ReactElement[] = []
  teeth.forEach((n, i) => {
    const t = chart[n]
    if (t.status !== 'present') return
    const ps = siteOrder(n)
    const rl = anatomy(n).rl
    const y = cy + dir * rl * 0.36
    for (const p of furcationSites(n, band.surf)) {
      const v = t[band.surf].furc[p]
      if (!v) continue
      const x = p === 'C' ? i * COL + COL / 2 : i * COL + (ps.indexOf(p) + 0.5) * SITE
      const color = v >= 3 ? 'var(--crit)' : v === 2 ? 'var(--warn)' : 'var(--ink-2)'
      const pts = band.above
        ? `${x - 4.5},${y - 3.5} ${x + 4.5},${y - 3.5} ${x},${y + 4}`
        : `${x - 4.5},${y + 3.5} ${x + 4.5},${y + 3.5} ${x},${y - 4}`
      marks.push(
        <polygon key={`${n}${p}`} points={pts} fill={v >= 3 ? color : 'var(--surface)'} stroke={color} strokeWidth={1.3} />,
      )
    }
  })
  return <g pointerEvents="none">{marks}</g>
}

export function ToothBand({ band, teeth, chart, gradKey, dispatch }: Props) {
  const up = band.above
  const cy = up ? CEJ_UP : CEJ_DOWN
  const dir = up ? -1 : 1
  const signature = teeth.map((n) => `${chart[n].status[0]}${chart[n].crown ? 'c' : ''}`).join('')

  return (
    <svg width={HALF_W} height={BAND_H} viewBox={`0 0 ${HALF_W} ${BAND_H}`} role="img" aria-label={`${band.label} teeth and roots`}>
      <Defs k={gradKey} concave={band.surf === 'L'} />
      <Rule cy={cy} dir={dir} />
      <line x1={0} y1={cy} x2={HALF_W} y2={cy} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 3" opacity={0.55} pointerEvents="none" />
      <ShadowLayer teeth={teeth} chart={chart} surf={band.surf} up={up} cy={cy} gradKey={gradKey} signature={signature} />
      {teeth.map((n, i) => (
        <g
          key={n}
          transform={`translate(${i * COL + COL / 2},${cy})`}
          style={{ cursor: dispatch ? 'context-menu' : undefined }}
          onContextMenu={
            dispatch
              ? (e) => {
                  e.preventDefault()
                  dispatch({ type: 'setCursor', at: { n, surf: band.surf, p: siteOrder(n)[1] } })
                  dispatch({ type: 'cycleTooth', n })
                }
              : undefined
          }
        >
          {/*
            A missing tooth is drawn as an unfilled outline, so its interior is
            not hit-testable and the right click would fall through. Every
            column keeps this transparent target instead, which also makes the
            gaps between roots on a present tooth clickable.
          */}
          <rect x={-COL / 2} y={-cy} width={COL} height={BAND_H} fill="transparent" />
          <Tooth n={n} surf={band.surf} up={up} gradKey={gradKey} status={chart[n].status} crown={chart[n].crown} />
        </g>
      ))}
      <FurcationMarks band={band} teeth={teeth} chart={chart} gradKey={gradKey} cy={cy} dir={dir} />
      <PocketGraph band={band} teeth={teeth} chart={chart} gradKey={gradKey} cy={cy} dir={dir} />
    </svg>
  )
}

const ShadowLayer = memo(function ShadowLayer({
  teeth, chart, surf, up, cy, gradKey,
}: { teeth: number[]; chart: Chart; surf: Band['surf']; up: boolean; cy: number; gradKey: string; signature: string }) {
  return (
    <g filter={`url(#shd${gradKey})`} opacity={0.3} pointerEvents="none">
      {teeth.map((n, i) => {
        if (chart[n].status === 'missing') return null
        return (
          <g key={n} transform={`translate(${i * COL + COL / 2 + 1.5},${cy + 2.4})${up ? '' : ' scale(1,-1)'}`}>
            <path d={toothShape(n, surf).silhouette} fill="var(--tooth-shadow)" />
          </g>
        )
      })}
    </g>
  )
}, (a, b) => a.signature === b.signature && a.cy === b.cy && a.up === b.up && a.gradKey === b.gradKey)
