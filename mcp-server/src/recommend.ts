// ============================================================================
// COMPONENT RECOMMENDATION ENGINE (recommend_components)
// ============================================================================
// A rule-based reasoning layer the agent CONSULTS before composing the UI.
// This keeps "which components fit this situation" as an explicit, auditable
// decision instead of the LLM freehanding a layout — the agent can still
// deviate (it has judgment), but every suggestion here carries a `reason` so
// the UI can literally show the user "por qué te muestro esto".

import type { ComponentType } from "@hackmty/shared";

export type Intent =
  | "save_for_goal"
  | "inflation_check"
  | "spending_review"
  | "business_overview"
  | "general_overview"
  | "cashflow_check"
  | "get_recommendations"
  | "compare_periods"
  | "emergency_fund_check"
  | "investment_prep";

export interface RecommendInput {
  userContext: { student?: boolean; entrepreneur?: boolean };
  intent: Intent;
  goal?: string;
  timeHorizonMonths?: number;
  activeContext: "personal" | "business";
}

export interface RecommendedComponent {
  component: ComponentType;
  priority: number;
  reason: string;
}

const RULES: Record<Intent, (input: RecommendInput) => RecommendedComponent[]> = {
  save_for_goal: (input) => [
    { component: "financial_goal_card", priority: 1, reason: `Muestra el objetivo "${input.goal ?? "meta"}" y cuánto falta para alcanzarlo.` },
    { component: "savings_progress", priority: 2, reason: "Visualiza el progreso actual vs. la meta como barra/anillo, más intuitivo que un número solo." },
    { component: "cash_flow_card", priority: 3, reason: "Determina la capacidad mensual real de ahorro (ingreso - gasto)." },
    { component: "line_chart", priority: 4, reason: "Compara el ahorro acumulado real contra la trayectoria necesaria para llegar a tiempo." },
    { component: "scenario_simulator", priority: 5, reason: "Permite explorar '¿qué pasa si ahorro más al mes?' de forma interactiva." },
    { component: "ai_insight", priority: 6, reason: "Traduce los números en una conclusión clara sobre si el ritmo actual alcanza." },
  ],
  inflation_check: (input) => [
    { component: "kpi_card", priority: 1, reason: "Ahorro nominal — dato real de la cuenta." },
    { component: "kpi_card", priority: 2, reason: "Inflación del periodo — dato del indicador económico (Banxico/INEGI)." },
    { component: "line_chart", priority: 3, reason: "Compara la curva de ahorro nominal vs. inflación acumulada en el tiempo." },
    { component: "ai_insight", priority: 4, reason: "Explica el poder adquisitivo real resultante de comparar ambas series." },
  ],
  spending_review: () => [
    { component: "donut_chart", priority: 1, reason: "El desglose de gasto por categoría se entiende mejor como proporción visual que como lista." },
    { component: "comparison_chart", priority: 2, reason: "Compara el gasto de este periodo contra el anterior por categoría." },
    { component: "transaction_list", priority: 3, reason: "Detalle transaccional para que el usuario pueda verificar el origen del gasto." },
    { component: "ai_insight", priority: 4, reason: "Señala la categoría con mayor variación y por qué importa." },
  ],
  business_overview: () => [
    { component: "business_revenue_card", priority: 1, reason: "Ingreso, gasto y utilidad del negocio en una sola tarjeta ejecutiva." },
    { component: "cash_flow_card", priority: 2, reason: "Flujo de efectivo del negocio — crítico para un emprendedor con ingresos variables." },
    { component: "line_chart", priority: 3, reason: "Tendencia de ingresos del negocio en los últimos meses." },
    { component: "donut_chart", priority: 4, reason: "Distribución del gasto operativo (nómina, insumos, renta, marketing)." },
    { component: "transaction_list", priority: 5, reason: "Movimientos recientes de la cuenta del negocio." },
  ],
  general_overview: (input) => {
    const items: RecommendedComponent[] = [
      { component: "balance_card", priority: 1, reason: "Punto de partida: cuánto dinero tiene disponible el usuario ahora." },
      { component: "cash_flow_card", priority: 2, reason: "Flujo mensual personal — ingresos vs. gastos." },
    ];
    if (input.userContext.entrepreneur) {
      items.push({ component: "business_revenue_card", priority: 3, reason: "El usuario también opera un negocio — se integra ese contexto en la misma vista." });
    }
    items.push({ component: "savings_progress", priority: 4, reason: "Progreso hacia la meta financiera activa." });
    items.push({ component: "ai_insight", priority: 5, reason: "Resumen ejecutivo de cómo van sus finanzas en general." });
    return items;
  },
  cashflow_check: () => [
    { component: "cash_flow_card", priority: 1, reason: "Responde directamente ingreso vs. gasto del periodo." },
    { component: "line_chart", priority: 2, reason: "Tendencia del flujo de efectivo en los últimos meses." },
    { component: "ai_insight", priority: 3, reason: "Interpreta si el flujo es sano o requiere atención." },
  ],
  get_recommendations: () => [
    { component: "ai_recommendation", priority: 1, reason: "El usuario pidió explícitamente consejos — este es el componente diseñado para eso, con disclaimer incluido." },
    { component: "emergency_fund_progress", priority: 2, reason: "El fondo de emergencia suele ser la base de cualquier recomendación financiera responsable." },
    { component: "ai_insight", priority: 3, reason: "Contexto que sustenta las recomendaciones con datos reales." },
  ],
  compare_periods: () => [
    { component: "comparison_chart", priority: 1, reason: "Comparación lado a lado es la forma más clara de mostrar diferencias entre periodos." },
    { component: "kpi_card", priority: 2, reason: "Cambio porcentual como cifra destacada." },
    { component: "ai_insight", priority: 3, reason: "Explica la causa probable del cambio." },
  ],
  emergency_fund_check: () => [
    { component: "emergency_fund_progress", priority: 1, reason: "Muestra meses cubiertos vs. meses objetivo de fondo de emergencia." },
    { component: "kpi_card", priority: 2, reason: "Monto líquido disponible actualmente." },
    { component: "ai_insight", priority: 3, reason: "Recomendación de cuánto le falta para llegar al colchón objetivo." },
  ],
  investment_prep: () => [
    { component: "emergency_fund_progress", priority: 1, reason: "Antes de invertir, se verifica que exista colchón de emergencia (principio de finanzas responsables)." },
    { component: "kpi_card", priority: 2, reason: "Tasa de referencia / CETES actual como contexto de mercado." },
    { component: "ai_recommendation", priority: 3, reason: "Sugerencias de producto solo si el fondo de emergencia ya está cubierto." },
  ],
};

export function recommendComponents(input: RecommendInput): { recommended: RecommendedComponent[]; rationale: string } {
  const rule = RULES[input.intent] ?? RULES.general_overview;
  const recommended = rule(input);
  return {
    recommended,
    rationale: `Para la intención "${input.intent}" en contexto "${input.activeContext}", se priorizan ${recommended.length} componentes ordenados por relevancia directa a la pregunta del usuario.`,
  };
}
