import { CreditCard, Landmark, PiggyBank } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/demo-data/customers'

const ICONS = { checking: Landmark, savings: PiggyBank, credit: CreditCard, business: Landmark }

export function AccountCard({ customer, props }: { customer: Customer; props: { context?: 'personal' | 'business' } }) {
  const accounts = customer.accounts.filter((a) => !props?.context || a.context === props.context)
  return (
    <div className="fin-card account-card">
      <span className="fin-card-label">{props?.context === 'business' ? 'Cuentas del negocio' : 'Tus cuentas'}</span>
      <ul className="account-list">
        {accounts.map((account) => {
          const Icon = ICONS[account.type]
          return (
            <li key={account.id}>
              <Icon aria-hidden="true" />
              <div>
                <strong>{account.label}</strong>
                <span>{formatCurrency(account.balance, account.currency)}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
