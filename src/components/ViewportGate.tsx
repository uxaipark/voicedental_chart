/**
 * The arch is 1010 px of teeth and no fewer — six sites on 32 teeth cannot be
 * probed accurately on a squeezed grid, so the chart is never scaled down to
 * fit. When the window is below what the layout needs, that is stated plainly
 * rather than left for the clinician to discover mid-exam.
 */
export const MIN_CHART_W = 1100 // chart alone, side panels folded
export const MIN_FULL_W = 1620 // chart with both panels pinned

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
          <dd className="mono">{MIN_CHART_W} px<em>side panels folded</em></dd>
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
