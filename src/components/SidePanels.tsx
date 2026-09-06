import type { ReactNode } from 'react'

/**
 * The switch sits at the top of the rail it changes, and names both states
 * rather than only the current one — a single-label toggle never says whether
 * the word on it is where you are or where you would go.
 */
export function RailSwitch({ value, onChange }: { value: 'clinical' | 'record'; onChange: (v: 'clinical' | 'record') => void }) {
  const TABS: Array<{ id: 'clinical' | 'record'; label: string; hint: string }> = [
    { id: 'clinical', label: 'Chart', hint: 'Patient details, legend and past exams' },
    { id: 'record', label: 'Record', hint: 'Patient summary and the edit history' },
  ]
  return (
    <div className="railswitch" role="tablist" aria-label="Left panel">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          title={t.hint}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Who the clinician is treating is never folded away. */
export function PatientCard() {
  return (
    <section className="card">
      <div className="card-b">
        <div className="pt-name">Raymora, Julia M.</div>
        <div className="pt-sub">Chart 1023-44871 · 42 y · Female</div>
        <dl className="kv">
          <dt>Last perio</dt><dd className="mono">2025-03-11</dd>
          <dt>Recall</dt><dd>3-mo perio maint.</dd>
          <dt>Smoking</dt><dd>8 cig/day · 14 yr</dd>
          <dt>HbA1c</dt><dd className="mono">7.4 %</dd>
          <dt>Referring</dt><dd>Dr. K. Rossi</dd>
        </dl>
        <div className="alerts">
          <div className="eyebrow">Medical alert</div>
          <ul>
            <li>Allergy — <b>Penicillin</b>, latex</li>
            <li>Type 2 diabetes, uncontrolled</li>
            <li>Anticoagulant — apixaban 5 mg BID</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/** The short form of the patient card, for when the panel is showing the record. */
export function PatientBrief() {
  return (
    <section className="card">
      <div className="card-b">
        <div className="pt-name">Raymora, Julia M.</div>
        <div className="pt-sub">Chart 1023-44871 · 42 y · Female</div>
        <dl className="kv compact">
          <dt>Exam</dt><dd className="mono">2026-09-06</dd>
          <dt>Provider</dt><dd>RDH J. Sandoval</dd>
          <dt>Last perio</dt><dd className="mono">2025-03-11</dd>
        </dl>
        <div className="briefalert">
          <b>Penicillin</b> · latex · T2DM · apixaban
        </div>
      </div>
    </section>
  )
}

export function Legend() {
  return (
    <div className="card-b">
      <div className="legend">
          <div className="legend-row"><span className="swatch" style={{ background: 'var(--pd-fill)', border: '1px solid var(--gum)' }} />Pocket zone<span className="lg-note">PD</span></div>
          <div className="legend-row"><span className="swatch" style={{ background: 'var(--gum)' }} />Gingival margin<span className="lg-note">GM</span></div>
          <div className="legend-row"><span className="swatch" style={{ background: 'var(--cal-line)' }} />Attachment level<span className="lg-note">CAL</span></div>
          <div className="legend-row"><span className="swatch" style={{ background: 'transparent', borderTop: '2px dashed var(--ink-3)', height: 0 }} />CEJ · 1 mm rule</div>
          <div className="legend-row"><span className="dotk m-bop" />Bleeding on probing</div>
          <div className="legend-row"><span className="dotk m-sup" />Suppuration</div>
          <div className="legend-row"><span className="dotk m-plq" />Plaque</div>
          <div className="legend-row"><span className="dotk m-clc" />Calculus</div>
          <div className="legend-row"><span className="mono" style={{ color: 'var(--gi)', fontWeight: 600 }}>0–3</span>Gingival index<span className="lg-note">Löe</span></div>
          <div className="legend-row">▲ furcation I–II&ensp;▲ III<span className="lg-note">Glickman</span></div>
          <div className="legend-row">
            <span style={{ color: 'var(--ok)' }}>▪ ≤3 mm</span>
            <span style={{ color: 'var(--warn)' }}>▪ 4–5 mm</span>
            <span style={{ color: 'var(--crit)' }}>▪ ≥6 mm</span>
          </div>
      </div>
    </div>
  )
}

export const HISTORY = [
  { date: '2026-09-06 · today', who: 'Sandoval', dot: 'var(--accent)' },
  { date: '2025-03-11', who: 'Sandoval', dot: 'var(--ok)' },
  { date: '2024-08-27', who: 'Okafor', dot: 'var(--ok)' },
  { date: '2024-02-14 · SRP re-eval', who: 'Rossi', dot: 'var(--warn)' },
  { date: '2023-06-02', who: 'Sandoval', dot: 'var(--ok)' },
]

export function ExamHistory() {
  return (
    <div className="card-b hist">
        {HISTORY.map((h) => (
          <button key={h.date}>
            <span className="dot" style={{ background: h.dot }} />
            {h.date}
            <span className="who">{h.who}</span>
          </button>
      ))}
    </div>
  )
}
