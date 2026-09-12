import type { ComponentType as ReactComponentType } from 'react'
import type { Customer } from '@/lib/demo-data/customers'
import type { ComponentSpec } from './schema'

import { SituationBanner } from '@/components/financial/situation-banner'
import { KpiCard } from '@/components/financial/kpi-card'
import { AccountCard } from '@/components/financial/account-card'
import { TransactionList } from '@/components/financial/transaction-list'
import { GoalProgress } from '@/components/financial/goal-progress'
import { SpendingChart } from '@/components/financial/spending-chart'
import { ComparisonChart } from '@/components/financial/comparison-chart'
import { AlertCard } from '@/components/financial/alert-card'
import { RecommendationCard } from '@/components/financial/recommendation-card'
import { ExchangeRateCard } from '@/components/financial/exchange-rate-card'
import { CardControls } from '@/components/financial/card-controls'
import { BusinessSummary } from '@/components/financial/business-summary'

export interface FinancialComponentProps {
  customer: Customer
  props: Record<string, unknown>
}

// El Component Registry es la unica fuente de verdad entre el "type" string
// que devuelve el agente y el componente React real que se monta. Agregar un
// componente nuevo a la biblioteca = agregarlo aqui + a ALLOWED_COMPONENT_TYPES
// (lib/mcp/tools.ts) + opcionalmente a un context/situations/*.json.
export const COMPONENT_REGISTRY: Record<string, ReactComponentType<FinancialComponentProps>> = {
  situation_banner: SituationBanner as unknown as ReactComponentType<FinancialComponentProps>,
  kpi: KpiCard as unknown as ReactComponentType<FinancialComponentProps>,
  account_card: AccountCard as unknown as ReactComponentType<FinancialComponentProps>,
  transaction_list: TransactionList as unknown as ReactComponentType<FinancialComponentProps>,
  goal_progress: GoalProgress as unknown as ReactComponentType<FinancialComponentProps>,
  spending_chart: SpendingChart as unknown as ReactComponentType<FinancialComponentProps>,
  comparison_chart: ComparisonChart as unknown as ReactComponentType<FinancialComponentProps>,
  alert: AlertCard as unknown as ReactComponentType<FinancialComponentProps>,
  recommendation: RecommendationCard as unknown as ReactComponentType<FinancialComponentProps>,
  exchange_rate: ExchangeRateCard as unknown as ReactComponentType<FinancialComponentProps>,
  card_controls: CardControls as unknown as ReactComponentType<FinancialComponentProps>,
  business_summary: BusinessSummary as unknown as ReactComponentType<FinancialComponentProps>,
}

export function renderComponent(spec: ComponentSpec, customer: Customer) {
  const Component = COMPONENT_REGISTRY[spec.type]
  if (!Component) return null
  return { key: spec.id, element: <Component customer={customer} props={spec.props} /> }
}
