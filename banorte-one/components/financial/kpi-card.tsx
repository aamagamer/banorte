import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface KpiProps {
  title: string
  value: number
  format?: 'currency' | 'percent' | 'number'
  currency?: 'MXN' | 'USD'
  trend?: number
  helpText?: string
}

export function KpiCard({ props }: { props: KpiProps }) {
  const { title, value, format = 'currency', currency = 'MXN', trend, helpText } = props
  const displayValue = format === 'currency' ? formatCurrency(value, currency) : format === 'percent' ? formatPercent(value) : value.toLocaleString('es-MX')
  return (
    <div className="fin-card kpi-card">
      <span className="fin-card-label">{title}</span>
      <strong className="kpi-value">{displayValue}</strong>
      {typeof trend === 'number' && (
        <span className={trend >= 0 ? 'kpi-trend up' : 'kpi-trend down'}>
          {trend >= 0 ? <ArrowUpRight aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}
          {formatPercent(Math.abs(trend))} vs. mes anterior
        </span>
      )}
      {helpText && <p className="fin-card-help">{helpText}</p>}
    </div>
  )
}
