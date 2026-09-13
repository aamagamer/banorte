import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/demo-data/customers'

// La app es solo tema claro (ver :root en globals.css).
//
// Tres formas de colorear la grafica, de menos a mas especifico:
// 1. Nada especificado -> DEFAULT_PALETTE: colorido desde el inicio (una
//    familia de color distinta por categoria), sin que el cliente tenga que
//    pedirlo.
// 2. props.accent -> toda la grafica usa UNA familia (ver ACCENT_PALETTES),
//    con un tono distinto por categoria dentro de esa familia. Es lo que se
//    activa con "cambiale el color a azul".
// 3. props.categoryColors -> asigna una familia de color especifica a cada
//    categoria por posicion (0 = la de mayor gasto, 1 = la siguiente, etc),
//    mezclando familias entre si. Es lo que se activa con "ponle rojo y
//    azul" (categorias distintas, colores de familias distintas). Un indice
//    sin entrada cae al accent o al default.
export const SPENDING_CHART_ACCENTS = ['red', 'blue', 'green', 'purple', 'black'] as const
export type SpendingChartAccent = (typeof SPENDING_CHART_ACCENTS)[number]

const ACCENT_PALETTES: Record<SpendingChartAccent, string[]> = {
  red: ['#e9003d', '#b4002d', '#f2a6bb', '#33404a', '#64717b'],
  blue: ['#1d6fd6', '#0d3f80', '#a9c8f2', '#33404a', '#64717b'],
  green: ['#178657', '#0d5c3a', '#a8dfc4', '#33404a', '#64717b'],
  purple: ['#7c3fd6', '#4a1f8a', '#d3bdf2', '#33404a', '#64717b'],
  black: ['#1a1f24', '#33404a', '#64717b', '#9aa5ad', '#c7ced3'],
}

// Colorido desde el primer render, sin pedirlo: una familia de color distinta
// por posicion (no tonos de la misma familia, como pasaba antes).
const DEFAULT_PALETTE = ['#e9003d', '#1d6fd6', '#178657', '#7c3fd6', '#33404a']

function isAccentName(value: unknown): value is SpendingChartAccent {
  return SPENDING_CHART_ACCENTS.includes(value as SpendingChartAccent)
}

// Regresa una funcion (index) -> color, resolviendo las 3 fuentes de color de
// arriba en orden de especificidad.
function buildColorResolver(props: { accent?: string; categoryColors?: unknown }): (index: number) => string {
  const basePalette = isAccentName(props?.accent) ? ACCENT_PALETTES[props.accent] : DEFAULT_PALETTE
  const overrides = Array.isArray(props?.categoryColors) ? props.categoryColors : []

  return (index: number) => {
    const override = overrides[index]
    if (isAccentName(override)) return ACCENT_PALETTES[override][0]
    return basePalette[index % basePalette.length]
  }
}

function buildCategoryTotals(customer: Customer, context?: 'personal' | 'business') {
  const expenses = customer.transactions.filter((t) => t.amount < 0 && (!context || t.context === context))
  const totals = new Map<string, number>()
  for (const t of expenses) totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount))
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
}

function PieSlices({ rows, total, colorFor }: { rows: [string, number][]; total: number; colorFor: (index: number) => string }) {
  const r = 70
  const cx = 90
  const cy = 90
  let angleStart = -90 // arranca arriba, sentido horario, como un reloj

  return (
    <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Distribucion de gasto por categoria">
      {rows.map(([category, amount], index) => {
        const fraction = total > 0 ? amount / total : 0
        const angleSpan = fraction * 360
        const angleEnd = angleStart + angleSpan
        const largeArc = angleSpan > 180 ? 1 : 0

        const toXY = (angleDeg: number) => {
          const rad = (angleDeg * Math.PI) / 180
          return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
        }
        const [x1, y1] = toXY(angleStart)
        const [x2, y2] = toXY(angleEnd)
        const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`
        angleStart = angleEnd

        return <path key={category} d={path} fill={colorFor(index)} />
      })}
      <circle cx={cx} cy={cy} r={34} fill="#ffffff" />
    </svg>
  )
}

export function SpendingChart({
  customer,
  props,
}: {
  customer: Customer
  props: { context?: 'personal' | 'business'; variant?: 'bar' | 'pie'; accent?: string; categoryColors?: string[] }
}) {
  const rows = buildCategoryTotals(customer, props?.context)
  const max = Math.max(...rows.map(([, amount]) => amount), 1)
  const total = rows.reduce((sum, [, amount]) => sum + amount, 0)
  const variant = props?.variant === 'pie' ? 'pie' : 'bar'
  const colorFor = buildColorResolver(props)

  if (variant === 'pie') {
    return (
      <div className="fin-card spending-chart spending-chart-pie">
        <span className="fin-card-label">Gasto por categoria</span>
        <div className="spending-chart-pie-body">
          <PieSlices rows={rows} total={total} colorFor={colorFor} />
          <ul className="spending-chart-legend">
            {rows.map(([category, amount], index) => (
              <li key={category}>
                <span className="spending-chart-swatch" style={{ background: colorFor(index) }} />
                <span className="spending-chart-category">{category.replaceAll('_', ' ')}</span>
                <span className="spending-chart-amount">{formatCurrency(amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="fin-card spending-chart">
      <span className="fin-card-label">Gasto por categoria</span>
      <div className="spending-chart-columns">
        {rows.map(([category, amount], index) => (
          <div key={category} className="spending-chart-column">
            <span className="spending-chart-column-amount">{formatCurrency(amount)}</span>
            <div className="spending-chart-column-track">
              <div
                className="spending-chart-column-bar"
                style={{ height: `${(amount / max) * 100}%`, background: colorFor(index) }}
              />
            </div>
            <span className="spending-chart-column-label">{category.replaceAll('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}