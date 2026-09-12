import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/demo-data/customers'

export function BusinessSummary({ customer }: { customer: Customer; props: Record<string, unknown> }) {
  if (!customer.business) return null
  const { name, revenueMonthly, expensesMonthly } = customer.business
  const netFlow = revenueMonthly - expensesMonthly
  return (
    <div className="fin-card business-summary">
      <span className="fin-card-label">{name}</span>
      <div className="business-summary-grid">
        <div>
          <span>Ingresos</span>
          <strong>{formatCurrency(revenueMonthly)}</strong>
        </div>
        <div>
          <span>Gastos</span>
          <strong>{formatCurrency(expensesMonthly)}</strong>
        </div>
        <div>
          <span>Flujo neto</span>
          <strong className={netFlow >= 0 ? 'positive' : 'negative'}>{formatCurrency(netFlow)}</strong>
        </div>
      </div>
    </div>
  )
}
