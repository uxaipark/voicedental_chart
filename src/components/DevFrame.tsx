import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export interface FormFactor {
  id: string
  label: string
  hint: string
  w: number
  h: number
}

/**
 * CSS pixels, not panel pixels. A 4K monitor reports 3840×2160 only at 100%
 * scaling; at the 150% most people run it the page sees 2560×1440, so both are
 * listed. iPad Pro figures are the landscape CSS viewport.
 */
export const FORM_FACTORS: FormFactor[] = [
  { id: 'fhd', label: 'FHD · 1920 × 1080', hint: 'The common clinic monitor', w: 1920, h: 1080 },
  { id: '4k-100', label: '4K · 3840 × 2160', hint: 'At 100 % scaling — a great deal of room', w: 3840, h: 2160 },
  { id: '4k-150', label: '4K at 150 % · 2560 × 1440', hint: 'How a 4K panel is usually actually run', w: 2560, h: 1440 },
  { id: 'ipad', label: 'iPad Pro 12.9″ · 1366 × 1024', hint: 'Landscape, chairside on a stand', w: 1366, h: 1024 },
  { id: 'ipad-p', label: 'iPad Pro 12.9″ portrait · 1024 × 1366', hint: 'Portrait — the hardest case for the arch', w: 1024, h: 1366 },
]

const CHROME = 46 // room for the toolbar above the frame

export function DevFrame({ factor, onClose, children }: { factor: FormFactor; onClose: () => void; children: ReactNode }) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const fit = () => {
      const s = Math.min(1, (window.innerWidth - 24) / factor.w, (window.innerHeight - CHROME - 24) / factor.h)
      setScale(Math.max(0.1, s))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [factor])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className="devstage">
      <div className="devbar">
        <span className="dv-tag">Form factor</span>
        <strong>{factor.label}</strong>
        <span className="dv-hint">{factor.hint}</span>
        <span className="dv-scale mono">{Math.round(scale * 100)}%</span>
        <button className="chip" onClick={onClose}>Exit preview</button>
      </div>
      <div className="devscroll">
        <div
          className="devframe"
          style={{
            width: factor.w,
            height: factor.h,
            transform: `scale(${scale})`,
            // Viewport units inside would still measure the real window, so the
            // frame publishes its own height for anything that needs it.
            ['--vph' as string]: `${factor.h}px`,
          }}
        >
          {children}
        </div>
      </div>
      <div className="devspacer" style={{ width: factor.w * scale, height: factor.h * scale }} />
    </div>
  )
}
