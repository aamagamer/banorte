import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/demo-data/customers'

export function TransactionList({ customer, props }: { customer: Customer; props: { context?: 'personal' | 'business'; limit?: number } }) {
  let transactions = customer.transactions.filter((t) => !props?.context || t.context === props.context)
  transactions = [...transactions].reverse().slice(0, props?.limit ?? 5)
  return (
    <div className="fin-card transaction-list">
      <span className="fin-card-label">Movimientos recientes</span>
      <table>
        <thead>
          <tr>
            <th scope="col">Descripcion</th>
            <th scope="col">Fecha</th>
            <th scope="col" className="col-amount">
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <th scope="row">{t.description}</th>
              <td>{t.date}</td>
              <td className={t.amount >= 0 ? 'amount positive' : 'amount negative'}>
                {t.amount >= 0 ? '+' : ''}
                {formatCurrency(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
