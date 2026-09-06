import { memo } from 'react'
import { anatomy } from '../domain/anatomy'
import { implantShape, toothShape } from '../domain/geometry'
import type { Surface, ToothStatus } from '../domain/types'

interface Props {
  n: number
  surf: Surface
  /** roots point up, toward the data rows */
  up: boolean
  gradKey: string
  status: ToothStatus
  crown: boolean
}

const edge = {
  stroke: 'var(--tooth-line)',
  strokeOpacity: 0.72,
  strokeWidth: 0.85,
  strokeLinejoin: 'round' as const,
}

/**
 * One tooth, in its own local space: +y toward the crown, -y toward the apex.
 * Nothing here depends on a measurement, so React skips the whole subtree
 * while an exam is being recorded.
 */
function ToothInner({ n, surf, up, gradKey, status, crown }: Props) {
  const a = anatomy(n, surf)
  const transform = `translate(0,0)${up ? '' : ' scale(1,-1)'}`

  if (status === 'missing') {
    const s = toothShape(n, surf)
    return (
      <g transform={transform} opacity={0.42}>
        {s.roots.map((r, i) => (
          <path key={i} d={r.d} fill="none" stroke="var(--line-3)" strokeWidth={0.9} strokeDasharray="3 3" />
        ))}
        <path d={s.crown} fill="none" stroke="var(--line-3)" strokeWidth={0.9} strokeDasharray="3 3" />
        <text x={0} y={up ? 4 : -2} textAnchor="middle" fontSize={13} fill="var(--ink-3)" transform={up ? undefined : 'scale(1,-1)'}>
          ✕
        </text>
      </g>
    )
  }

  if (status === 'implant') {
    const s = implantShape(n, surf)
    return (
      <g transform={transform}>
        <path d={s.body} fill="var(--implant)" stroke="var(--ink-3)" strokeOpacity={0.7} strokeWidth={0.85} />
        {s.threads.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeOpacity={0.38} strokeWidth={1} />
        ))}
        <path d={s.body} fill={`url(#rcy${gradKey})`} />
        <rect x={s.abutment.x} y={s.abutment.y} width={s.abutment.w} height={s.abutment.h} rx={1.6}
              fill="var(--implant)" stroke="var(--ink-3)" strokeOpacity={0.7} strokeWidth={0.85} />
        <g transform={`translate(0,${s.crownDy})`}>
          <path d={s.crown} fill={`url(#en${gradKey})`} {...edge} />
          <path d={s.cap} fill={`url(#enm${gradKey})`} />
          <path d={s.crown} fill={`url(#lb${gradKey}${s.cusps})`} />
          <path d={s.crown} fill={`url(#spc${gradKey})`} />
          <path d={s.crown} fill={`url(#gls${gradKey})`} />
        </g>
      </g>
    )
  }

  const s = toothShape(n, surf)
  return (
    <g transform={transform}>
      {s.roots.map((r, i) => (
        <path key={`r${i}`} d={r.d} fill={`url(#rt${gradKey})`} opacity={r.back ? 0.8 : undefined} {...edge} />
      ))}
      {s.roots.map((r, i) => (
        <path key={`rc${i}`} d={r.d} fill={`url(#rcy${gradKey})`} opacity={r.back ? 0.75 : undefined} />
      ))}
      <path d={s.crown} fill={`url(#en${gradKey})`} {...edge} />
      <path d={s.cap} fill={`url(#enm${gradKey})`} />
      {s.ridges?.map((d, i) => (
        <path key={`m${i}`} d={d} fill="none" stroke="var(--tooth-line)" strokeOpacity={0.22} strokeWidth={0.8} strokeLinecap="round" />
      ))}
      {s.cingulum && (
        <>
          <path d={s.cingulum} fill="#fff" opacity={0.17} />
          <path d={s.cingulum} fill="none" stroke="var(--tooth-line)" strokeOpacity={0.26} strokeWidth={0.8} />
        </>
      )}
      {s.grooves.map((g, i) => (
        <path key={`g${i}`} d={g.d} fill="none" stroke="var(--tooth-line)" strokeOpacity={g.o} strokeWidth={0.75} strokeLinecap="round" />
      ))}
      <path d={s.crown} fill={`url(#lb${gradKey}${s.cusps})`} />
      <path d={s.crown} fill={`url(#spc${gradKey})`} />
      <path d={s.crown} fill={`url(#gls${gradKey})`} />
      {crown && <path d={s.crown} fill="none" stroke="var(--accent)" strokeWidth={1.1} strokeDasharray="3 2" opacity={0.72} />}
    </g>
  )
}

export const Tooth = memo(ToothInner)
