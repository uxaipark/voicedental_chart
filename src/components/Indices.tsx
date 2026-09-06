import { useMemo } from 'react'
import type { Chart } from '../domain/types'
import { STAGE_LABEL, computeMetrics, suggestStage } from '../domain/metrics'

function Stat({ label, value, sub, hot, bar }: { label: string; value: string | number; sub?: string; hot?: boolean; bar?: number }) {
  return (
    <div className={`stat${hot ? ' hot' : ''}`}>
      <div className="lab">{label}</div>
      <div className="val">{value}{sub && <small>{sub}</small>}</div>
      {bar !== undefined && <div className="bar"><i style={{ width: `${bar}%` }} /></div>}
    </div>
  )
}

export function Indices({ chart }: { chart: Chart }) {
  const m = useMemo(() => computeMetrics(chart), [chart])
  const stage = suggestStage(m)
  return (
    <div className="card-b">
      <div className="stats">
        <Stat label="Bleeding" value={m.bopPct} sub="%" hot={m.bopPct >= 30} bar={m.bopPct} />
        <Stat label="Plaque" value={m.plqPct} sub="%" hot={m.plqPct >= 40} bar={m.plqPct} />
        <Stat label="Mean PD" value={m.meanPd} sub="mm" />
        <Stat label="Mean CAL" value={m.meanCal} sub="mm" />
        <Stat label="PD ≥ 4 mm" value={m.p4} sub="sites" />
        <Stat label="PD ≥ 6 mm" value={m.p6} sub="sites" hot={m.p6 > 0} />
        <Stat label="Furcation ≥ II" value={m.furcation2.length} sub="teeth" hot={m.furcation2.length > 0} />
        <Stat label="Recession" value={m.recessionSites} sub="sites" />
      </div>
      <div className="dx">
        <div className="dxbox"><div className="lab">Stage</div><div className="val">{STAGE_LABEL[stage - 1]}</div></div>
        <div className="dxbox"><div className="lab">Grade</div><div className="val">B <small>manual</small></div></div>
        <div className="dxbox">
          <div className="lab">Extent</div>
          <div className="val">{m.extentPct >= 30 ? 'Generalized' : 'Localized'} <small>{m.extentPct}%</small></div>
        </div>
      </div>
      <p className="note">
        Stage is suggested from interdental CAL, PD ≥ 6 mm, furcation, mobility and tooth loss per AAP/EFP 2017.
        Grade needs the bone-loss/age ratio plus smoking and HbA1c — set it manually.
      </p>
    </div>
  )
}
