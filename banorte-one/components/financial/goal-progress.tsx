import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/demo-data/customers'

export function GoalProgress({ customer, props }: { customer: Customer; props: { goalId?: string } }) {
  const goal = customer.goals.find((g) => g.id === props?.goalId) ?? customer.goals[0]
  if (!goal) return null
  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100))
  return (
    <div className="fin-card goal-progress">
      <span className="fin-card-label">{goal.label}</span>
      <div className="goal-progress-track">
        <div className="goal-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="goal-progress-numbers">
        <strong>{percent}%</strong>
        <span>
          {formatCurrency(goal.current)} de {formatCurrency(goal.target)}
        </span>
      </div>
      <p className="fin-card-help">Meta para {new Date(goal.targetDate).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</p>
    </div>
  )
}
