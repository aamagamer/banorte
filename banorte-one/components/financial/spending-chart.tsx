import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/demo-data/customers'

export function SpendingChart({ customer, props }: { customer: Customer; props: { context?: 'personal' | 'business' } }) {
  const expenses = customer.transactions.filter((t) => t.amount < 0 && (!props?.context || t.context === props.context))
  const totals = new Map<string, number>()
  for (const t of expenses) totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount))
  const rows = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const max = Math.max(...rows.map(([, amount]) => amount), 1)
  return (
    <div className="fin-card spending-chart">
      <span className="fin-card-label">Gasto por categoria</span>
      <ul>
        {rows.map(([category, amount]) => (
          <li key={category}>
            <span className="spending-chart-category">{category.replaceAll('_', ' ')}</span>
            <div className="spending-chart-track">
              <div className="spending-chart-fill" style={{ width: `${(amount / max) * 100}%` }} />
            </div>
            <span className="spending-chart-amount">{formatCurrency(amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
