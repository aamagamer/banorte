import { formatCurrency } from '@/lib/utils'

interface ComparisonSeriesPoint {
  month: string
  nominal: number
  real: number
}

interface ComparisonChartProps {
  title?: string
  subtitle?: string
  months?: ComparisonSeriesPoint[]
  inflationAnnual?: number
}

const WIDTH = 520
const HEIGHT = 220
const PAD_LEFT = 8
const PAD_RIGHT = 8
const PAD_TOP = 28
const PAD_BOTTOM = 28

function buildPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

export function ComparisonChart({ props }: { props: ComparisonChartProps }) {
  const data = props?.months ?? []
  const inflationAnnual = props?.inflationAnnual

  if (data.length === 0) {
    return (
      <div className="fin-card comparison-chart">
        <span className="fin-card-label">{props?.title ?? 'Ahorro vs inflacion'}</span>
        <p className="chart-empty">No hay suficientes datos para proyectar.</p>
      </div>
    )
  }

  const allValues = data.flatMap((d) => [d.nominal, d.real])
  const min = Math.min(...allValues, 0)
  const max = Math.max(...allValues)
  const range = max - min || 1
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM

  const xFor = (i: number) => PAD_LEFT + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const yFor = (v: number) => PAD_TOP + innerH - ((v - min) / range) * innerH

  const nominalPoints = data.map((d, i) => ({ x: xFor(i), y: yFor(d.nominal) }))
  const realPoints = data.map((d, i) => ({ x: xFor(i), y: yFor(d.real) }))

  const last = data[data.length - 1]
  const lastNominalPoint = nominalPoints[nominalPoints.length - 1]
  const lastRealPoint = realPoints[realPoints.length - 1]

  return (
    <div className="fin-card comparison-chart">
      <div className="comparison-chart-header">
        <span className="fin-card-label">{props?.title ?? 'Ahorro nominal vs poder adquisitivo real'}</span>
        {typeof inflationAnnual === 'number' && (
          <span className="comparison-chart-subtitle">Inflacion anual estimada: {inflationAnnual.toFixed(1)}%</span>
        )}
      </div>

      <div className="comparison-chart-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: '#e9003d' }} />
          Ahorro nominal
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: '#1d6fd6' }} />
          Poder adquisitivo real
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="comparison-chart-svg" role="img" aria-label="Comparacion de ahorro nominal contra poder adquisitivo real">
        <line x1={PAD_LEFT} y1={PAD_TOP + innerH} x2={WIDTH - PAD_RIGHT} y2={PAD_TOP + innerH} className="chart-axis" />

        <path d={buildPath(nominalPoints)} fill="none" stroke="#e9003d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={buildPath(realPoints)} fill="none" stroke="#1d6fd6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {nominalPoints.map((p, i) => (
          <circle key={`n-${i}`} cx={p.x} cy={p.y} r={4} fill="#e9003d" stroke="var(--muted)" strokeWidth={2}>
            <title>{`${data[i].month}: ${formatCurrency(data[i].nominal)} (nominal)`}</title>
          </circle>
        ))}
        {realPoints.map((p, i) => (
          <circle key={`r-${i}`} cx={p.x} cy={p.y} r={4} fill="#1d6fd6" stroke="var(--muted)" strokeWidth={2}>
            <title>{`${data[i].month}: ${formatCurrency(data[i].real)} (real)`}</title>
          </circle>
        ))}

        <text x={lastNominalPoint.x} y={lastNominalPoint.y - 10} textAnchor="end" className="chart-end-label">
          {formatCurrency(last.nominal)}
        </text>
        <text x={lastRealPoint.x} y={lastRealPoint.y + 16} textAnchor="end" className="chart-end-label">
          {formatCurrency(last.real)}
        </text>

        {data.map((d, i) => (
          <text key={`x-${i}`} x={xFor(i)} y={HEIGHT - 6} textAnchor="middle" className="chart-axis-label">
            {d.month}
          </text>
        ))}
      </svg>

      <details className="comparison-chart-table">
        <summary>Ver datos</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Ahorro nominal</th>
              <th scope="col">Poder adquisitivo real</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>{d.month}</td>
                <td>{formatCurrency(d.nominal)}</td>
                <td>{formatCurrency(d.real)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
