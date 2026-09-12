import type { McpToolDefinition } from './types'
import { getCustomer, type Customer } from '@/lib/demo-data/customers'

import travelingSituation from '@/context/situations/traveling.json'
import payingSituation from '@/context/situations/paying.json'
import savingSituation from '@/context/situations/saving.json'
import lowBalanceSituation from '@/context/situations/low_balance.json'
import paydaySituation from '@/context/situations/payday.json'
import purchaseSituation from '@/context/situations/purchase.json'
import inflationSituation from '@/context/situations/inflation.json'

import studentProfile from '@/context/profiles/student.json'
import parentProfile from '@/context/profiles/parent.json'
import professionalProfile from '@/context/profiles/professional.json'
import entrepreneurProfile from '@/context/profiles/entrepreneur.json'
import smeProfile from '@/context/profiles/sme.json'

export interface SituationDefinition {
  id: string
  label: string
  description: string
  signals: string[]
  priority: number
  preferred_components: string[]
  secondary_components: string[]
  next_best_actions: { label: string; action: string }[]
}

export const SITUATIONS: SituationDefinition[] = [
  travelingSituation,
  payingSituation,
  savingSituation,
  lowBalanceSituation,
  paydaySituation,
  purchaseSituation,
  inflationSituation,
]

export const PROFILES = {
  student: studentProfile,
  parent: parentProfile,
  professional: professionalProfile,
  entrepreneur: entrepreneurProfile,
  sme: smeProfile,
} as const

// ---------------------------------------------------------------------------
// Financial Data Tools
// ---------------------------------------------------------------------------

const getCustomerProfile: McpToolDefinition<{ customerId: string }, { customer: Customer; profile: unknown }> = {
  name: 'get_customer_profile',
  description: 'Obtiene el perfil declarado del cliente (estudiante, padre de familia, profesionista, emprendedor, pyme) y sus intereses.',
  permission: 'read',
  run: ({ customerId }) => {
    const customer = getCustomer(customerId)
    return { customer: { id: customer.id, name: customer.name, profile: customer.profile }, profile: PROFILES[customer.profile] } as any
  },
}

const getCustomerAccounts: McpToolDefinition<{ customerId: string }, { accounts: Customer['accounts'] }> = {
  name: 'get_customer_accounts',
  description: 'Regresa las cuentas (personales y de negocio) del cliente con su saldo actual.',
  permission: 'read',
  run: ({ customerId }) => ({ accounts: getCustomer(customerId).accounts }),
}

const getCustomerTransactions: McpToolDefinition<
  { customerId: string; context?: 'personal' | 'business'; limit?: number },
  { transactions: Customer['transactions'] }
> = {
  name: 'get_customer_transactions',
  description: 'Regresa los movimientos recientes del cliente, opcionalmente filtrados por contexto personal/negocio.',
  permission: 'read',
  run: ({ customerId, context, limit }) => {
    let transactions = getCustomer(customerId).transactions
    if (context) transactions = transactions.filter((t) => t.context === context)
    return { transactions: limit ? transactions.slice(0, limit) : transactions }
  },
}

const getCustomerGoals: McpToolDefinition<{ customerId: string }, { goals: Customer['goals'] }> = {
  name: 'get_customer_goals',
  description: 'Regresa las metas financieras activas del cliente (ahorro, fondo de emergencia, etc).',
  permission: 'read',
  run: ({ customerId }) => ({ goals: getCustomer(customerId).goals }),
}

// ---------------------------------------------------------------------------
// Financial Analysis Tools
// ---------------------------------------------------------------------------

const calculateCashFlow: McpToolDefinition<{ customerId: string; context?: 'personal' | 'business' }, { income: number; expenses: number; net: number }> = {
  name: 'calculate_cash_flow',
  description: 'Calcula ingresos, gastos y flujo neto del cliente para un contexto dado a partir de sus movimientos.',
  permission: 'read',
  run: ({ customerId, context }) => {
    const transactions = getCustomer(customerId).transactions.filter((t) => !context || t.context === context)
    const income = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const expenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return { income, expenses, net: income - expenses }
  },
}

const calculateSpendingByCategory: McpToolDefinition<{ customerId: string; context?: 'personal' | 'business' }, { breakdown: { category: string; amount: number }[] }> = {
  name: 'calculate_spending_by_category',
  description: 'Agrupa los gastos del cliente por categoria para alimentar graficas de gasto.',
  permission: 'read',
  run: ({ customerId, context }) => {
    const transactions = getCustomer(customerId).transactions.filter((t) => t.amount < 0 && (!context || t.context === context))
    const totals = new Map<string, number>()
    for (const t of transactions) totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount))
    const breakdown = Array.from(totals.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
    return { breakdown }
  },
}

const calculateGoalProjection: McpToolDefinition<
  { customerId: string; goalId: string; monthlyContribution?: number },
  { monthsRemaining: number | null; onTrack: boolean; requiredMonthly: number }
> = {
  name: 'calculate_goal_projection',
  description: 'Proyecta cuantos meses faltan para alcanzar una meta y compara contra el ahorro mensual actual del cliente.',
  permission: 'read',
  run: ({ customerId, goalId, monthlyContribution }) => {
    const customer = getCustomer(customerId)
    const goal = customer.goals.find((g) => g.id === goalId) ?? customer.goals[0]
    if (!goal) return { monthsRemaining: null, onTrack: false, requiredMonthly: 0 }
    const remaining = Math.max(goal.target - goal.current, 0)
    const monthsUntilTarget = Math.max(
      1,
      Math.round((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)),
    )
    const requiredMonthly = Math.ceil(remaining / monthsUntilTarget)
    const contribution = monthlyContribution ?? Math.round(remaining / Math.max(monthsUntilTarget, 1) * 0.7)
    const monthsRemaining = contribution > 0 ? Math.ceil(remaining / contribution) : null
    return { monthsRemaining, onTrack: (monthsRemaining ?? Infinity) <= monthsUntilTarget, requiredMonthly }
  },
}

// ---------------------------------------------------------------------------
// Economic Data Tools (Demo Mode — ver docs/ARCHITECTURE.md "External Financial
// Data Adapter" para el plan de conectar Banxico/INEGI reales)
// ---------------------------------------------------------------------------

const getExchangeRate: McpToolDefinition<{ from: string; to: string }, { from: string; to: string; rate: number; source: string }> = {
  name: 'get_exchange_rate',
  description: 'Regresa el tipo de cambio entre dos monedas. En modo demo usa un valor simulado realista.',
  permission: 'read',
  run: ({ from, to }) => {
    const table: Record<string, number> = { 'USD-MXN': 18.62, 'MXN-USD': 1 / 18.62, 'EUR-MXN': 20.05 }
    const key = `${from.toUpperCase()}-${to.toUpperCase()}`
    return { from, to, rate: table[key] ?? 1, source: 'Demo Mode (simulado) — produccion: Banxico SIE API' }
  },
}

const getInflation: McpToolDefinition<{ country?: string }, { annualRate: number; period: string; source: string }> = {
  name: 'get_inflation',
  description: 'Regresa la inflacion anual estimada. En modo demo usa un valor simulado realista para Mexico.',
  permission: 'read',
  run: () => ({ annualRate: 4.3, period: 'anual', source: 'Demo Mode (simulado) — produccion: INEGI INPC' }),
}

const calculatePurchasingPowerProjection: McpToolDefinition<
  { customerId: string; months?: number },
  { months: { month: string; nominal: number; real: number }[]; inflationAnnual: number; nominalGrowthPct: number; realGrowthPct: number }
> = {
  name: 'calculate_purchasing_power_projection',
  description:
    'Proyecta el ahorro nominal del cliente contra su poder adquisitivo real (descontando inflacion) mes a mes, para comparar ahorro vs inflacion.',
  permission: 'read',
  run: ({ customerId, months = 6 }) => {
    const customer = getCustomer(customerId)
    const savingsBalance = customer.accounts
      .filter((a) => a.type === 'savings' && a.context === 'personal')
      .reduce((sum, a) => sum + a.balance, 0)
    const personalTransactions = customer.transactions.filter((t) => t.context === 'personal')
    const income = personalTransactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const expenses = personalTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const monthlyContribution = Math.max(Math.round((income - expenses) * 0.3), 300)
    const annualRate = 4.3
    const monthlyRate = annualRate / 100 / 12
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const startMonth = new Date().getMonth()
    const series: { month: string; nominal: number; real: number }[] = []
    let nominal = savingsBalance
    for (let i = 0; i <= months; i++) {
      if (i > 0) nominal += monthlyContribution
      const real = nominal / Math.pow(1 + monthlyRate, i)
      series.push({ month: monthNames[(startMonth + i) % 12], nominal: Math.round(nominal), real: Math.round(real) })
    }
    const first = series[0]
    const last = series[series.length - 1]
    const nominalGrowthPct = first.nominal > 0 ? ((last.nominal - first.nominal) / first.nominal) * 100 : 0
    const realGrowthPct = first.real > 0 ? ((last.real - first.real) / first.real) * 100 : 0
    return {
      months: series,
      inflationAnnual: annualRate,
      nominalGrowthPct: Math.round(nominalGrowthPct * 10) / 10,
      realGrowthPct: Math.round(realGrowthPct * 10) / 10,
    }
  },
}

// ---------------------------------------------------------------------------
// Situation Engine + Next Best Action
// ---------------------------------------------------------------------------

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export interface SituationResult {
  primary: SituationDefinition | null
  secondary: SituationDefinition[]
  matchedSignals: Record<string, string[]>
}

function matchSituations(message: string, customer: Customer): SituationResult {
  const normalizedMessage = normalize(message)
  const matchedSignals: Record<string, string[]> = {}
  const scored = SITUATIONS.map((situation) => {
    const hits = situation.signals.filter((signal) => normalizedMessage.includes(normalize(signal)))
    if (hits.length > 0) matchedSignals[situation.id] = hits
    return { situation, score: hits.length }
  }).filter((entry) => entry.score > 0)

  // Senal derivada de datos (no solo texto): saldo bajo real del cliente.
  const totalPersonalBalance = customer.accounts
    .filter((a) => a.context === 'personal')
    .reduce((sum, a) => sum + a.balance, 0)
  if (totalPersonalBalance < 5000 && !matchedSignals['low_balance']) {
    const lowBalance = SITUATIONS.find((s) => s.id === 'low_balance')
    if (lowBalance) {
      scored.push({ situation: lowBalance, score: 1 })
      matchedSignals['low_balance'] = ['saldo_personal_bajo (dato)']
    }
  }

  if (scored.length === 0) return { primary: null, secondary: [], matchedSignals }

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.situation.priority - b.situation.priority))
  const [primary, ...rest] = scored
  return { primary: primary.situation, secondary: rest.slice(0, 2).map((r) => r.situation), matchedSignals }
}

const detectSituation: McpToolDefinition<{ customerId: string; message: string }, SituationResult> = {
  name: 'detect_situation',
  description: 'Analiza el mensaje del usuario y sus datos financieros para determinar la situacion primaria y situaciones secundarias.',
  permission: 'read',
  run: ({ customerId, message }) => matchSituations(message, getCustomer(customerId)),
}

const getNextBestActions: McpToolDefinition<{ situationId: string | null }, { actions: { label: string; action: string }[] }> = {
  name: 'get_next_best_actions',
  description: 'Regresa las acciones recomendadas (Next Best Action) para la situacion detectada.',
  permission: 'read',
  run: ({ situationId }) => {
    const situation = SITUATIONS.find((s) => s.id === situationId)
    return { actions: situation?.next_best_actions ?? [] }
  },
}

// ---------------------------------------------------------------------------
// UI Tools
// ---------------------------------------------------------------------------

export const ALLOWED_COMPONENT_TYPES = [
  'situation_banner',
  'kpi',
  'account_card',
  'transaction_list',
  'goal_progress',
  'spending_chart',
  'comparison_chart',
  'alert',
  'recommendation',
  'exchange_rate',
  'card_controls',
  'business_summary',
] as const

const getAllowedComponents: McpToolDefinition<Record<string, never>, { components: readonly string[] }> = {
  name: 'get_allowed_components',
  description: 'Regresa el catalogo de tipos de componente que la UI sabe renderizar. generate_ui_schema no puede usar tipos fuera de esta lista.',
  permission: 'read',
  run: () => ({ components: ALLOWED_COMPONENT_TYPES }),
}

export const TOOLS: McpToolDefinition[] = [
  getCustomerProfile,
  getCustomerAccounts,
  getCustomerTransactions,
  getCustomerGoals,
  calculateCashFlow,
  calculateSpendingByCategory,
  calculateGoalProjection,
  getExchangeRate,
  getInflation,
  calculatePurchasingPowerProjection,
  detectSituation,
  getNextBestActions,
  getAllowedComponents,
]
