import type { Action, AppState } from '../state/chartReducer'
import type { MarkRow, NumericSiteRow } from '../domain/types'
import { POS_NAME, surfaceName, toothLabel } from '../domain/numbering'
import { furcationSites, hasMgj } from '../domain/anatomy'

const REC_CLASSES = ['', 'Miller I', 'Miller II', 'Miller III', 'Cairo RT1', 'Cairo RT2']
const MARKS: Array<[MarkRow, string]> = [['bop', 'Bleeding'], ['sup', 'Suppuration'], ['plq', 'Plaque'], ['clc', 'Calculus']]

export function SiteInspector({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { chart, cursor, meta } = state
  const t = chart[cursor.n]
  const o = t[cursor.surf]
  const p = cursor.p
  const pd = o.pd[p]
  const gm = o.gm[p]
  const cal = pd == null ? null : pd + (gm ?? 0)

  const Chips = ({ values, active, onPick, labels, small = true }: {
    values: number[]; active: number | null | undefined; onPick: (v: number) => void; labels?: string[]; small?: boolean
  }) => (
    <div className="seg">
      {values.map((v, i) => (
        <button key={v} className={`chip${small ? ' sm' : ''}${active === v ? ' on' : ''}`} onClick={() => onPick(v)}>
          {labels ? labels[i] : v}
        </button>
      ))}
    </div>
  )

  const Tri = ({ label, value, tone }: { label: string; value: number | null | undefined; tone: string }) => (
    <div className={`tri ${tone}`}>
      <div className="lab">{label}</div>
      <div className="val">{value ?? '–'}</div>
    </div>
  )

  return (
    <div className="card-b">
      <div className="insp-site">
        <span className="t">{toothLabel(cursor.n, meta.numbering)}</span>
        <span className="s">
          {surfaceName(cursor.n, cursor.surf)} · {POS_NAME[p]} · {t.status === 'implant' ? 'implant' : t.crown ? 'crowned' : 'natural'}
          {meta.numbering !== 'uni' && ` · Universal ${cursor.n}`}
        </span>
      </div>

      <div className="triad">
        <Tri label="PD" value={pd} tone={(pd ?? 0) >= 6 ? 'crit' : (pd ?? 0) >= 4 ? 'warn' : ''} />
        <Tri label="GM" value={gm} tone="" />
        <Tri label="CAL" value={cal} tone={(cal ?? 0) >= 5 ? 'crit' : (cal ?? 0) >= 3 ? 'warn' : ''} />
      </div>

      <div className="fieldrow">
        <span className="eyebrow">PD mm</span>
        <Chips values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} active={pd}
               onPick={(v) => dispatch({ type: 'setValue', row: 'pd', value: v })} />
      </div>
      <div className="fieldrow">
        <span className="eyebrow">GM rec</span>
        <Chips values={[-2, -1, 0, 1, 2, 3, 4, 5, 6]} active={gm}
               onPick={(v) => dispatch({ type: 'setValue', row: 'gm', value: v })} />
      </div>
      <div className="fieldrow">
        <span className="eyebrow">Markers</span>
        <div className="seg">
          {MARKS.map(([row, label]) => (
            <button key={row} className={`chip k-${row}${o[row][p] ? ' on' : ''}`} onClick={() => dispatch({ type: 'toggleMark', row })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="fieldrow">
        <span className="eyebrow">Ging. index</span>
        <Chips values={[0, 1, 2, 3]} active={o.gi[p] ?? 0} onPick={(v) => dispatch({ type: 'setValue', row: 'gi', value: v })} />
      </div>
      <div className="fieldrow">
        <span className="eyebrow">Mobility</span>
        <Chips values={[0, 1, 2, 3]} active={t.mobility} onPick={(v) => dispatch({ type: 'setValue', row: 'mob', value: v })} />
      </div>
      {furcationSites(cursor.n, cursor.surf).includes(p) && (
        <div className="fieldrow">
          <span className="eyebrow">Furcation</span>
          <Chips values={[0, 1, 2, 3]} labels={['0', 'I', 'II', 'III']} active={o.furc[p]}
                 onPick={(v) => dispatch({ type: 'setValue', row: 'furc', value: v })} />
        </div>
      )}
      {hasMgj(cursor.n, cursor.surf) && (
        <div className="fieldrow">
          <span className="eyebrow">MGJ mm</span>
          <Chips values={[0, 1, 2, 3, 4, 5, 6, 7, 8]} active={o.mgj.C}
                 onPick={(v) => dispatch({ type: 'setValue', row: 'mgj' as NumericSiteRow, value: v })} />
        </div>
      )}
      <div className="fieldrow">
        <span className="eyebrow">Recession</span>
        <div className="seg">
          {REC_CLASSES.map((c) => (
            <button key={c || 'none'} className={`chip${t.recClass === c ? ' on' : ''}`}
                    onClick={() => dispatch({ type: 'setRecClass', n: cursor.n, recClass: c })}>
              {c || 'none'}
            </button>
          ))}
        </div>
      </div>
      <div className="fieldrow">
        <span className="eyebrow">Tooth</span>
        <div className="seg">
          {(['present', 'missing', 'implant'] as const).map((st) => (
            <button key={st} className={`chip${t.status === st ? ' on' : ''}`}
                    onClick={() => dispatch({ type: 'setStatus', n: cursor.n, status: st })}>
              {st[0].toUpperCase() + st.slice(1)}
            </button>
          ))}
          <button className={`chip${t.crown ? ' on' : ''}`} onClick={() => dispatch({ type: 'toggleCrown', n: cursor.n })}>Crown</button>
        </div>
      </div>
    </div>
  )
}
