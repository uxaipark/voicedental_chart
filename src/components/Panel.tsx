import type { ReactNode } from 'react'

/**
 * A card whose header is the control that collapses it. Open state is held in
 * app state rather than in the component, so it survives the rail switching
 * tabs and is carried in the autosaved draft.
 */
export function Panel({
  title,
  extra,
  open,
  onToggle,
  children,
}: {
  title: string
  extra?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className={`card${open ? '' : ' shut'}`}>
      <button className="card-h collapsible" onClick={onToggle} aria-expanded={open}>
        <h3>{title}</h3>
        {extra !== undefined && <span className="eyebrow">{extra}</span>}
        <svg className="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && children}
    </section>
  )
}
