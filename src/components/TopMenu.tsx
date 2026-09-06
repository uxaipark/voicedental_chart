import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Action, AppState, ChartView } from '../state/chartReducer'
import { CHART_VIEWS } from '../state/chartReducer'
import type { Numbering } from '../domain/types'
import { VOICE_MENU } from './VoiceDialogs'
import type { VoiceDialogId } from './VoiceDialogs'

const NUMBERINGS: Array<{ id: Numbering; label: string; hint: string }> = [
  { id: 'uni', label: 'Universal 1–32', hint: 'US convention — one number per tooth' },
  { id: 'fdi', label: 'FDI 18–48', hint: 'ISO 3950 — quadrant then tooth' },
  { id: 'palmer', label: 'Palmer UR/UL/LL/LR', hint: 'Quadrant letters with 1–8' },
]

type MenuId = 'chart' | 'numbering' | 'view' | 'voice' | 'exam'
const ORDER: MenuId[] = ['chart', 'numbering', 'view', 'voice', 'exam']

interface Props {
  active: ChartView
  editCount: number
  numbering: Numbering
  teethShown: AppState['teethShown']
  filed: { id: number; at: number } | null
  onFileExam: () => void
  onCopyJson: () => void
  copied: string | null
  listening: boolean
  onVoiceDialog: (id: VoiceDialogId) => void
  dispatch: (a: Action) => void
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

export function TopMenu({ active, editCount, numbering, teethShown, filed, onFileExam, onCopyJson, copied, listening, onVoiceDialog, dispatch }: Props) {
  const [open, setOpen] = useState<MenuId | null>(null)
  const [confirming, setConfirming] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => { if (!bar.current?.contains(e.target as Node)) setOpen(null) }
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(null); return }
      // Once a menu is open the arrows walk the bar, the way a menu bar behaves.
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      setOpen((cur) => {
        const i = ORDER.indexOf(cur!)
        return ORDER[(i + (e.key === 'ArrowRight' ? 1 : -1) + ORDER.length) % ORDER.length]
      })
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', keys)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', keys) }
  }, [open])

  useEffect(() => { if (open !== 'exam') setConfirming(false) }, [open])

  const bothShown = teethShown.U && teethShown.L
  const noneShown = !teethShown.U && !teethShown.L
  const mixed = !bothShown && !noneShown
  const pick = (a: Action) => { dispatch(a); setOpen(null) }

  const Choice = ({ checked, label, hint, onPick }: { checked: boolean; label: string; hint: string; onPick: () => void }) => (
    <button role="menuitemradio" aria-checked={checked} className={`menuitem${checked ? ' on' : ''}`} onClick={onPick}>
      <span className="tick">{checked ? '✓' : ''}</span>
      <span className="mi-main">
        {label}
        <em>{hint}</em>
      </span>
    </button>
  )

  const Menu = ({ id, label, badge, children }: { id: MenuId; label: string; badge?: string; children: ReactNode }) => (
    <div className="menuslot">
      <button
        className={`menutitle${open === id ? ' on' : ''}`}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open === id}
        onClick={() => setOpen(open === id ? null : id)}
        // Sliding along the bar with a menu already open switches menus.
        onMouseEnter={() => open && setOpen(id)}
      >
        {label}
        {badge && <span className="mt-badge">{badge}</span>}
      </button>
      {open === id && <div className="menupop" role="menu">{children}</div>}
    </div>
  )

  return (
    <div className="menubar" role="menubar" ref={bar}>
      <Menu id="chart" label="Chart">
        {CHART_VIEWS.map((v) => (
          <Choice
            key={v.id}
            checked={v.id === active}
            label={v.label}
            hint={v.hint}
            onPick={() => pick({ type: 'setChartView', view: v.id })}
          />
        ))}
      </Menu>

      <Menu id="numbering" label="Numbering">
        {NUMBERINGS.map((n) => (
          <Choice
            key={n.id}
            checked={n.id === numbering}
            label={n.label}
            hint={n.hint}
            onPick={() => pick({ type: 'setMeta', patch: { numbering: n.id } })}
          />
        ))}
      </Menu>

      <Menu id="view" label="View" badge={mixed ? (teethShown.U ? 'upper only' : 'lower only') : undefined}>
        <Choice
          checked={bothShown}
          label="Teeth + graph"
          hint="Anatomy, the millimetre rule and the pocket curves"
          onPick={() => pick({ type: 'setTeethShown', shown: true })}
        />
        <Choice
          checked={noneShown}
          label="Numbers only"
          hint="Just the measurement rows — denser, faster to scan"
          onPick={() => pick({ type: 'setTeethShown', shown: false })}
        />
        <div className="menusep" />
        <Choice
          checked={teethShown.U}
          label="Upper arch teeth"
          hint="Same as the eye beside the upper tooth numbers"
          onPick={() => dispatch({ type: 'setTeethShown', arch: 'U' })}
        />
        <Choice
          checked={teethShown.L}
          label="Lower arch teeth"
          hint="Same as the eye beside the lower tooth numbers"
          onPick={() => dispatch({ type: 'setTeethShown', arch: 'L' })}
        />
      </Menu>

      <Menu id="voice" label="Voice" badge={listening ? 'listening' : undefined}>
        {VOICE_MENU.map((v) => (
          <button
            key={v.id}
            role="menuitem"
            className="menuitem"
            onClick={() => { onVoiceDialog(v.id); setOpen(null) }}
          >
            <span className="tick">›</span>
            <span className="mi-main">
              {v.label}
              <em>{v.hint}</em>
            </span>
          </button>
        ))}
      </Menu>

      <Menu id="exam" label="Exam">
        <button
          role="menuitem"
          className="menuitem"
          onClick={() => { onFileExam(); setOpen(null) }}
        >
          <span className="tick">↧</span>
          <span className="mi-main">
            Complete exam
            <em>
              {filed
                ? `Files another record — last filed #${filed.id} at ${clock(filed.at)}`
                : 'Writes the committed record the next exam is compared against'}
            </em>
          </span>
        </button>
        <button role="menuitem" className="menuitem" onClick={onCopyJson}>
          <span className="tick">⎘</span>
          <span className="mi-main">
            {copied ?? 'Copy exam as JSON'}
            <em>For support and debugging — the filed record itself lives in SQLite</em>
          </span>
        </button>

        <div className="menusep" />
        {confirming ? (
          <div className="menuconfirm">
            <p>
              Discard {editCount.toLocaleString()} recorded edit{editCount === 1 ? '' : 's'} and load the sample exam
              again? The autosaved draft is overwritten; the audit log keeps what happened.
            </p>
            <div className="mc-row">
              <button className="chip" onClick={() => setConfirming(false)}>Keep</button>
              <button className="chip danger" onClick={() => pick({ type: 'resetToSample' })}>Reset chart</button>
            </div>
          </div>
        ) : (
          <button role="menuitem" className="menuitem danger" onClick={() => setConfirming(true)}>
            <span className="tick">⟲</span>
            <span className="mi-main">
              Reset everything
              <em>Clears the {editCount.toLocaleString()} recorded edits and all settings, back to the sample exam</em>
            </span>
          </button>
        )}
      </Menu>
    </div>
  )
}
