/**
 * The arch is 1010 px of teeth and no fewer — six sites on 32 teeth cannot be
 * probed accurately on a squeezed grid, so the chart is never scaled down to
 * fit. When the window is below what the layout needs, that is stated plainly
 * rather than left for the clinician to discover mid-exam.
 */
import { DENSITIES, cardWidth } from '../domain/density'

const PAGE_PAD = 36
const RAILS = 232 + 292 + 28

/** The tightest grid still shows every tooth; below this the arch cannot fit. */
export const MIN_CHART_W = cardWidth(DENSITIES[DENSITIES.length - 1]) + PAGE_PAD
/** Room for the chart at full size with both panels pinned. */
export const MIN_FULL_W = cardWidth(DENSITIES[0]) + RAILS + PAGE_PAD

export function ViewportGate({ width, onOverride }: { width: number; onOverride: () => void }) {
  const short = MIN_CHART_W - width
  return (
    <div className="gate">
      <div className="gatecard">
        <div className="eyebrow">Window too narrow</div>
        <h2>This chart needs more width</h2>
        <p>
          A full-mouth six-point chart is 32 teeth wide with three sites on each, and the grid is not scaled down to
          fit — a cramped column is how the wrong tooth gets the reading.
        </p>

        <dl className="gatespec">
          <dt>This window</dt>
          <dd className="mono bad">{width} px</dd>
          <dt>Chart alone</dt>
          <dd className="mono">{MIN_CHART_W} px<em>tightest grid, panels folded</em></dd>
          <dt>Chart with panels</dt>
          <dd className="mono">{MIN_FULL_W} px<em>the layout as designed</em></dd>
        </dl>

        <p className="note">
          Widen the window by {short} px, or use a larger display. On a tablet, landscape gives the room portrait
          cannot.
        </p>

        <button className="chip" onClick={onOverride}>Chart anyway — the grid will run off the screen</button>
      </div>
    </div>
  )
}
