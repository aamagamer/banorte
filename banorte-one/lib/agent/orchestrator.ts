// Orchestrator Agent (agente unico, ver docs/ARCHITECTURE.md seccion "Agent
// Architecture" para la justificacion de por que un solo agente + tools bien
// definidas en vez de multi-agente para este hackathon).
//
// Flujo: User message -> detect_situation (MCP) -> tools de analisis (MCP)
// -> composicion de componentes -> UI Schema validado -> React renderer.
// Este archivo es el unico lugar donde se decide "que tools llamar y en que
// orden"; los tools en si (lib/mcp/tools.ts) no saben nada de UI.

import { callTool } from '@/lib/mcp/registry'
import { getCustomer, type Customer } from '@/lib/demo-data/customers'
import type { McpActivityEntry } from '@/lib/mcp/types'
import { validateUISchema, fallbackUISchema, type UISchema, type ComponentSpec } from '@/lib/components-registry/schema'
import { formatCurrency } from '@/lib/utils'
import personalizationRules from '@/context/rules/personalization.json'
import { PROFILES } from '@/lib/mcp/tools'

export interface OrchestratorResult {
  reply: string
  uiSchema: UISchema
  mcpActivity: McpActivityEntry[]
}

function explainSituation(situationId: string | null, customer: Customer): string {
  const firstName = customer.name.split(' ')[0]
  switch (situationId) {
    case 'traveling':
      return `Detecte que ${firstName} esta planeando un viaje. Priorice tipo de cambio, tus cuentas y tus gastos para que tengas todo a la mano.`
    case 'saving':
      return `Veo que ${firstName} quiere ahorrar. Preparamos el progreso de tu meta, tu capacidad de ahorro mensual y una recomendacion.`
    case 'low_balance':
      return `Tu saldo disponible esta bajo. Simplifique la vista para que puedas revisar tus movimientos y actuar rapido.`
    case 'payday':
      return `Parece que acabas de recibir un ingreso. Te mostramos como distribuirlo entre tus metas y gastos proximos.`
    case 'purchase':
      return `Estas evaluando una compra importante. Te mostramos el impacto en tu presupuesto antes de decidir.`
    case 'paying':
      return `Preparamos una vista simple para que confirmes tu pago con la informacion justa y necesaria.`
    case 'inflation':
      return `Quieres saber como afecta la inflacion tu poder de compra. Comparamos tu ahorro nominal contra tu poder adquisitivo real para que veas el efecto en terminos reales.`
    default:
      if (customer.business) {
        return `Detecte que ${firstName} maneja finanzas personales y tambien la operacion de ${customer.business.name}. Preparamos una vista que integra ambos contextos.`
      }
      return `Aqui tienes tu resumen financiero, ${firstName}.`
  }
}

async function buildComponentsForSituation(
  situationId: string | null,
  customerId: string,
  activityLog: McpActivityEntry[],
): Promise<ComponentSpec[]> {
  const customer = getCustomer(customerId)
  const components: ComponentSpec[] = []
  let priority = 1
  const push = (type: ComponentSpec['type'], props: Record<string, unknown>) => {
    components.push({ type, id: `${type}-${priority}`, priority, props })
    priority += 1
  }

  switch (situationId) {
    case 'traveling': {
      const fx = await callTool<{ from: string; to: string; rate: number }>('get_exchange_rate', { from: 'USD', to: 'MXN' }, activityLog)
      push('exchange_rate', fx)
      push('account_card', { context: 'personal' })
      push('spending_chart', { context: 'personal' })
      push('card_controls', { context: 'personal' })
      break
    }
    case 'saving': {
      const goal = customer.goals[0]
      if (goal) push('goal_progress', { goalId: goal.id })
      const cashFlow = await callTool<{ income: number; expenses: number; net: number }>(
        'calculate_cash_flow',
        { customerId, context: 'personal' },
        activityLog,
      )
      push('kpi', {
        title: 'Ahorro mensual disponible',
        value: cashFlow.net,
        format: 'currency',
        helpText: 'Ingresos menos gastos del mes en tu cuenta personal.',
      })
      push('spending_chart', { context: 'personal' })
      if (goal) {
        const projection = await callTool<{ monthsRemaining: number | null; onTrack: boolean; requiredMonthly: number }>(
          'calculate_goal_projection',
          { customerId, goalId: goal.id },
          activityLog,
        )
        push('recommendation', {
          title: 'Ritmo de ahorro',
          message: projection.onTrack
            ? `Vas en buen ritmo para tu meta "${goal.label}".`
            : `Para alcanzar "${goal.label}" a tiempo, necesitarias ahorrar aproximadamente ${formatCurrency(projection.requiredMonthly)} al mes.`,
        })
      }
      break
    }
    case 'low_balance': {
      push('alert', {
        severity: 'warning',
        title: 'Tu saldo esta bajo',
        message: 'Revisa tus proximos pagos antes de hacer nuevos gastos.',
      })
      const balance = customer.accounts.filter((a) => a.context === 'personal').reduce((sum, a) => sum + a.balance, 0)
      push('kpi', { title: 'Saldo disponible', value: balance, format: 'currency' })
      push('transaction_list', { context: 'personal', limit: 5 })
      break
    }
    case 'payday': {
      const cashFlow = await callTool<{ income: number; expenses: number; net: number }>(
        'calculate_cash_flow',
        { customerId, context: 'personal' },
        activityLog,
      )
      push('kpi', { title: 'Ingreso recibido', value: cashFlow.income, format: 'currency' })
      const goal = customer.goals[0]
      if (goal) push('goal_progress', { goalId: goal.id })
      push('recommendation', {
        title: 'Distribuye tu ingreso',
        message: 'Considera separar una parte para tu meta y otra para gastos fijos antes de gastos variables.',
      })
      break
    }
    case 'purchase': {
      const balance = customer.accounts.filter((a) => a.context === 'personal').reduce((sum, a) => sum + a.balance, 0)
      push('kpi', { title: 'Saldo disponible', value: balance, format: 'currency' })
      const goal = customer.goals[0]
      if (goal) push('goal_progress', { goalId: goal.id })
      push('alert', {
        severity: 'info',
        title: 'Antes de comprar',
        message: 'Considera el impacto de esta compra en tus metas activas.',
      })
      break
    }
    case 'paying': {
      const balance = customer.accounts.filter((a) => a.context === 'personal').reduce((sum, a) => sum + a.balance, 0)
      push('kpi', { title: 'Monto disponible', value: balance, format: 'currency' })
      push('account_card', { context: 'personal' })
      push('card_controls', { context: 'personal' })
      break
    }
    case 'inflation': {
      const projection = await callTool<{
        months: { month: string; nominal: number; real: number }[]
        inflationAnnual: number
        nominalGrowthPct: number
        realGrowthPct: number
      }>('calculate_purchasing_power_projection', { customerId, months: 6 }, activityLog)
      const inflation = await callTool<{ annualRate: number }>('get_inflation', {}, activityLog)
      push('comparison_chart', {
        title: 'Ahorro nominal vs poder adquisitivo real',
        months: projection.months,
        inflationAnnual: inflation.annualRate,
      })
      push('kpi', { title: 'Crecimiento nominal (6 meses)', value: projection.nominalGrowthPct, format: 'percent' })
      push('kpi', { title: 'Crecimiento real (6 meses)', value: projection.realGrowthPct, format: 'percent' })
      push('recommendation', {
        title: 'Inflacion y tu ahorro',
        message:
          projection.realGrowthPct < projection.nominalGrowthPct
            ? `Tu ahorro nominal crecería ${projection.nominalGrowthPct}% en 6 meses, pero tu poder adquisitivo real solo ${projection.realGrowthPct}%, por una inflacion anual estimada de ${inflation.annualRate}%. Considera opciones de ahorro o inversion que superen la inflacion.`
            : `Tu ahorro esta creciendo por encima de la inflacion anual estimada (${inflation.annualRate}%).`,
      })
      break
    }
    default: {
      // Lee context/profiles/<perfil>.json (default_components) para que la
      // biblioteca de componentes mostrada por defecto dependa del perfil
      // declarado del cliente, no de un layout fijo en codigo.
      const profileKey = customer.profile as keyof typeof PROFILES
      const profileDefaults = ((PROFILES[profileKey] as { default_components?: string[] } | undefined)?.default_components ?? []) as string[]
      const goal = customer.goals[0]
      const cashFlow = await callTool<{ income: number; expenses: number; net: number }>(
        'calculate_cash_flow',
        { customerId, context: 'personal' },
        activityLog,
      )

      for (const type of profileDefaults) {
        if (type === 'situation_banner') continue
        switch (type) {
          case 'kpi':
            push('kpi', {
              title: 'Ahorro personal',
              value: customer.accounts
                .filter((a) => a.type === 'savings' && a.context === 'personal')
                .reduce((sum, a) => sum + a.balance, 0),
              format: 'currency',
            })
            break
          case 'account_card':
            push('account_card', { context: 'personal' })
            break
          case 'transaction_list':
            push('transaction_list', { context: 'personal', limit: 5 })
            break
          case 'goal_progress':
            if (goal) push('goal_progress', { goalId: goal.id })
            break
          case 'spending_chart':
            push('spending_chart', { context: 'personal' })
            break
          case 'business_summary':
            if (customer.business) push('business_summary', {})
            break
          case 'recommendation':
            push('recommendation', {
              title: 'Recomendacion',
              message:
                cashFlow.net >= 0
                  ? `Tu flujo personal es positivo este mes (${formatCurrency(cashFlow.net)}). Es buen momento para reforzar tu fondo de emergencia o tus metas.`
                  : `Tus gastos personales superaron tus ingresos este mes por ${formatCurrency(Math.abs(cashFlow.net))}. Revisa tus categorias de gasto mas altas.`,
            })
            break
          default:
            break
        }
      }
    }
  }

  const limit = (personalizationRules as { component_limit_per_dashboard?: number }).component_limit_per_dashboard ?? 6
  return components.slice(0, limit)
}

// Punto de entrada publico: LIVE (Claude con tool-calling real, ver
// lib/agent/llm-orchestrator.ts) cuando hay ANTHROPIC_API_KEY configurado;
// si no hay llave, o LIVE truena por cualquier motivo (red, rate limit,
// respuesta mal formada del modelo), cae a FALLBACK determinista — la demo
// nunca debe quedarse sin interfaz frente al jurado (ver docs/MCP.md,
// seccion 'LIVE vs FALLBACK').
export async function runOrchestrator(customerId: string, message: string): Promise<OrchestratorResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { runLiveOrchestrator } = await import('./llm-orchestrator')
      return await runLiveOrchestrator(customerId, message)
    } catch (error) {
      console.error('[orchestrator] LIVE (Claude tool-calling) fallo, usando FALLBACK', error)
    }
  }
  return runFallbackOrchestrator(customerId, message)
}

async function runFallbackOrchestrator(customerId: string, message: string): Promise<OrchestratorResult> {
  const activityLog: McpActivityEntry[] = []
  const customer = getCustomer(customerId)

  try {
    await callTool('get_customer_profile', { customerId }, activityLog)
    const situationResult = await callTool<{ primary: { id: string; label: string } | null }>(
      'detect_situation',
      { customerId, message },
      activityLog,
    )
    const situation = situationResult.primary
    const nextBestActions = await callTool<{ actions: { label: string; action: string }[] }>(
      'get_next_best_actions',
      { situationId: situation?.id ?? null },
      activityLog,
    )
    await callTool('get_allowed_components', {}, activityLog)

    const components = await buildComponentsForSituation(situation?.id ?? null, customerId, activityLog)
    const explanation = explainSituation(situation?.id ?? null, customer)

    if (situation) {
      components.unshift({
        type: 'situation_banner',
        id: 'situation-banner',
        priority: 0,
        props: { label: situation.label, explanation },
      })
    }

    const uiSchema = validateUISchema({
      situation: situation?.id ?? null,
      title: situation ? situation.label : `Resumen de ${customer.name.split(' ')[0]}`,
      explanation,
      components,
      nextBestActions: nextBestActions.actions,
    })

    return { reply: explanation, uiSchema, mcpActivity: activityLog }
  } catch (error) {
    console.error('[orchestrator] fallo generando la UI personalizada, usando fallback UI', error)
    return {
      reply: 'Tuvimos un problema generando tu vista personalizada. Te mostramos tu resumen general.',
      uiSchema: fallbackUISchema(),
      mcpActivity: activityLog,
    }
  }
}
