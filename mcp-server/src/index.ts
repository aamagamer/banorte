#!/usr/bin/env node
// ============================================================================
// Banorte Adaptive Financial Interface — MCP Server
// ============================================================================
// Exposes financial data, analysis, economic indicators, products, goals,
// UI composition, and user-context tools over MCP (stdio transport). The
// agent (web/src/lib/agent.ts) is the only consumer — it never talks to the
// "database" directly, only through these tools. Swap DemoDataAdapter
// (shared/src/demo-data.ts) for a real Banorte Sandbox + Banxico/INEGI
// adapter later without touching a single tool signature below.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  COMPONENT_TYPES,
  isValidComponentType,
  type FinancialGoal,
  type UIGenerationResult,
} from "@hackmty/shared";
import { store } from "./store.js";
import {
  calculateCashFlow,
  calculateEmergencyFund,
  calculateFinancialHealth,
  calculateGoalProjection,
  calculateSavingsRate,
  calculateSpendingByCategory,
  comparePeriods,
  simulateSavingsScenario,
} from "./calculations.js";
import { recommendComponents, type Intent } from "./recommend.js";

const server = new McpServer({ name: "banorte-adaptive-finance", version: "0.1.0" });

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(message: string) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }], isError: true };
}

const contextEnum = z.enum(["personal", "business"]);

// ---------------------------------------------------------------------------
// FINANCIAL DATA TOOLS (read-only)
// ---------------------------------------------------------------------------

server.registerTool(
  "get_accounts",
  {
    title: "Obtener cuentas",
    description: "Devuelve las cuentas bancarias del usuario, opcionalmente filtradas por contexto (personal o business).",
    inputSchema: { context: contextEnum.optional() },
  },
  async ({ context }) => json(context ? store.accounts.filter((a) => a.context === context) : store.accounts)
);

server.registerTool(
  "get_account_balance",
  {
    title: "Obtener saldo de cuenta",
    description: "Devuelve el saldo actual de una cuenta específica por id.",
    inputSchema: { accountId: z.string() },
  },
  async ({ accountId }) => {
    const acc = store.accounts.find((a) => a.id === accountId);
    return acc ? json(acc) : err(`No existe la cuenta ${accountId}`);
  }
);

server.registerTool(
  "get_transactions",
  {
    title: "Obtener transacciones",
    description: "Devuelve transacciones filtradas por contexto, categoría opcional y ventana de meses (default 1 mes).",
    inputSchema: {
      context: contextEnum.optional(),
      category: z.string().optional(),
      months: z.number().min(1).max(12).optional(),
    },
  },
  async ({ context, category, months }) => {
    const m = months ?? 1;
    const cutoff = new Date("2026-09-10");
    cutoff.setMonth(cutoff.getMonth() - m);
    let txs = store.transactions.filter((t) => new Date(t.date) >= cutoff);
    if (context) txs = txs.filter((t) => t.context === context);
    if (category) txs = txs.filter((t) => t.category === category);
    return json(txs.slice(0, 200));
  }
);

server.registerTool(
  "get_transaction_summary",
  {
    title: "Resumen de transacciones",
    description: "Resumen de ingresos/egresos totales y conteo de transacciones para un contexto y ventana de meses.",
    inputSchema: { context: contextEnum.optional(), months: z.number().min(1).max(12).optional() },
  },
  async ({ context, months }) => json(calculateCashFlow(context, months ?? 1))
);

server.registerTool(
  "get_income",
  {
    title: "Obtener ingresos",
    description: "Ingreso promedio mensual para un contexto, calculado sobre N meses de historial.",
    inputSchema: { context: contextEnum.optional(), months: z.number().min(1).max(12).optional() },
  },
  async ({ context, months }) => json(calculateCashFlow(context, months ?? 3))
);

server.registerTool(
  "get_expenses",
  {
    title: "Obtener gastos",
    description: "Gasto promedio mensual para un contexto, calculado sobre N meses de historial.",
    inputSchema: { context: contextEnum.optional(), months: z.number().min(1).max(12).optional() },
  },
  async ({ context, months }) => json(calculateSpendingByCategory(context, months ?? 3))
);

server.registerTool(
  "get_recurring_payments",
  {
    title: "Obtener pagos recurrentes",
    description: "Lista de pagos/cobros recurrentes (colegiatura, renta, nómina, beca, etc.) para un contexto.",
    inputSchema: { context: contextEnum.optional() },
  },
  async ({ context }) => json(context ? store.recurringPayments.filter((r) => r.context === context) : store.recurringPayments)
);

// ---------------------------------------------------------------------------
// FINANCIAL ANALYSIS TOOLS
// ---------------------------------------------------------------------------

server.registerTool(
  "calculate_cash_flow",
  {
    title: "Calcular flujo de efectivo",
    description: "Ingreso, gasto y flujo neto promedio mensual para un contexto y ventana de meses.",
    inputSchema: { context: contextEnum.optional(), months: z.number().min(1).max(12).optional() },
  },
  async ({ context, months }) => json(calculateCashFlow(context, months ?? 1))
);

server.registerTool(
  "calculate_savings_rate",
  {
    title: "Calcular tasa de ahorro",
    description: "Porcentaje del ingreso que se está ahorrando (flujo neto / ingreso) en un contexto.",
    inputSchema: { context: contextEnum.optional(), months: z.number().min(1).max(12).optional() },
  },
  async ({ context, months }) => json(calculateSavingsRate(context ?? "personal", months ?? 3))
);

server.registerTool(
  "calculate_spending_by_category",
  {
    title: "Calcular gasto por categoría",
    description: "Desglosa el gasto promedio mensual por categoría, ordenado de mayor a menor.",
    inputSchema: { context: contextEnum.optional(), months: z.number().min(1).max(12).optional() },
  },
  async ({ context, months }) => json(calculateSpendingByCategory(context, months ?? 3))
);

server.registerTool(
  "calculate_emergency_fund",
  {
    title: "Calcular fondo de emergencia",
    description: "Meses de gasto cubiertos por los activos líquidos actuales vs. el objetivo recomendado (4 meses personal, 6 meses negocio).",
    inputSchema: { context: contextEnum.optional() },
  },
  async ({ context }) => json(calculateEmergencyFund(context ?? "personal"))
);

server.registerTool(
  "calculate_financial_health",
  {
    title: "Calcular salud financiera",
    description: "Score compuesto ilustrativo (0-100, NO es un buró de crédito) combinando tasa de ahorro, fondo de emergencia y utilización de crédito.",
    inputSchema: { context: contextEnum.optional() },
  },
  async ({ context }) => json(calculateFinancialHealth(context ?? "personal"))
);

server.registerTool(
  "compare_periods",
  {
    title: "Comparar periodos",
    description: "Compara una métrica (income/expenses/net) del periodo actual contra un periodo anterior.",
    inputSchema: {
      context: contextEnum.optional(),
      metric: z.enum(["income", "expenses", "net"]).optional(),
      periodsBack: z.number().min(1).max(12).optional(),
    },
  },
  async ({ context, metric, periodsBack }) => json(comparePeriods(context ?? "personal", metric ?? "expenses", periodsBack ?? 1))
);

// ---------------------------------------------------------------------------
// ECONOMIC DATA TOOLS
// ---------------------------------------------------------------------------

server.registerTool(
  "get_inflation",
  { title: "Obtener inflación", description: "Inflación general anual (INPC). Dato simulado para demo, etiquetado como tal." },
  async () => json(store.economicIndicators.find((i) => i.key === "inflation"))
);

server.registerTool(
  "get_interest_rates",
  { title: "Obtener tasas de interés", description: "Tasa de referencia Banxico y CETES 28 días. Dato simulado para demo." },
  async () => json(store.economicIndicators.filter((i) => i.key === "interest_rate" || i.key === "cetes_28"))
);

server.registerTool(
  "get_exchange_rate",
  { title: "Obtener tipo de cambio", description: "Tipo de cambio USD/MXN spot. Dato simulado para demo." },
  async () => json(store.economicIndicators.find((i) => i.key === "exchange_rate_usd_mxn"))
);

server.registerTool(
  "get_economic_indicator",
  {
    title: "Obtener indicador económico",
    description: "Obtiene un indicador económico específico por clave.",
    inputSchema: { key: z.enum(["inflation", "interest_rate", "exchange_rate_usd_mxn", "cetes_28"]) },
  },
  async ({ key }) => {
    const ind = store.economicIndicators.find((i) => i.key === key);
    return ind ? json(ind) : err(`Indicador ${key} no encontrado`);
  }
);

// ---------------------------------------------------------------------------
// PRODUCT TOOLS
// ---------------------------------------------------------------------------

server.registerTool("get_savings_products", { title: "Productos de ahorro", description: "Catálogo de productos de ahorro Banorte disponibles." }, async () =>
  json(store.financialProducts.filter((p) => p.category === "savings"))
);
server.registerTool("get_credit_products", { title: "Productos de crédito", description: "Catálogo de productos de crédito Banorte disponibles." }, async () =>
  json(store.financialProducts.filter((p) => p.category === "credit"))
);
server.registerTool("get_investment_products", { title: "Productos de inversión", description: "Catálogo de productos de inversión Banorte disponibles." }, async () =>
  json(store.financialProducts.filter((p) => p.category === "investment"))
);
server.registerTool(
  "compare_products",
  {
    title: "Comparar productos",
    description: "Compara todos los productos de una categoría por tasa/rendimiento.",
    inputSchema: { category: z.enum(["savings", "credit", "investment"]) },
  },
  async ({ category }) => json(store.financialProducts.filter((p) => p.category === category).sort((a, b) => b.rate - a.rate))
);

// ---------------------------------------------------------------------------
// GOAL TOOLS
// ---------------------------------------------------------------------------

server.registerTool(
  "create_financial_goal",
  {
    title: "Crear meta financiera",
    description: "Crea una nueva meta financiera para el usuario.",
    inputSchema: {
      context: contextEnum,
      name: z.string(),
      targetAmount: z.number().positive(),
      currentAmount: z.number().min(0).default(0),
      targetDate: z.string(),
    },
  },
  async ({ context, name, targetAmount, currentAmount, targetDate }) => {
    const goal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      ownerId: store.profile.id,
      context,
      name,
      targetAmount,
      currentAmount: currentAmount ?? 0,
      targetDate,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "on_track",
    };
    store.upsertGoal(goal);
    return json(goal);
  }
);

server.registerTool(
  "update_financial_goal",
  {
    title: "Actualizar meta financiera",
    description: "Actualiza campos de una meta existente (monto actual, monto objetivo o fecha).",
    inputSchema: {
      goalId: z.string(),
      currentAmount: z.number().optional(),
      targetAmount: z.number().optional(),
      targetDate: z.string().optional(),
    },
  },
  async ({ goalId, currentAmount, targetAmount, targetDate }) => {
    const goal = store.getGoal(goalId);
    if (!goal) return err(`No existe la meta ${goalId}`);
    const updated = { ...goal, ...(currentAmount !== undefined && { currentAmount }), ...(targetAmount !== undefined && { targetAmount }), ...(targetDate !== undefined && { targetDate }) };
    store.upsertGoal(updated);
    return json(updated);
  }
);

server.registerTool(
  "calculate_goal_projection",
  {
    title: "Proyectar meta financiera",
    description: "Calcula si la meta se alcanzará a tiempo con la contribución mensual actual o una hipotética.",
    inputSchema: { goalId: z.string(), monthlyContribution: z.number().positive().optional() },
  },
  async ({ goalId, monthlyContribution }) => {
    const goal = store.getGoal(goalId);
    if (!goal) return err(`No existe la meta ${goalId}`);
    return json(calculateGoalProjection(goal, monthlyContribution));
  }
);

server.registerTool(
  "simulate_savings_scenario",
  {
    title: "Simular escenario de ahorro",
    description: "Genera la serie de proyección mes a mes del ahorro acumulado dada una contribución mensual hipotética. Úsalo para alimentar un scenario_simulator o line_chart.",
    inputSchema: { goalId: z.string(), monthlyContribution: z.number().positive() },
  },
  async ({ goalId, monthlyContribution }) => {
    const goal = store.getGoal(goalId);
    if (!goal) return err(`No existe la meta ${goalId}`);
    return json(simulateSavingsScenario(goal, monthlyContribution));
  }
);

server.registerTool("list_goals", { title: "Listar metas", description: "Lista todas las metas financieras, opcionalmente por contexto.", inputSchema: { context: contextEnum.optional() } }, async ({ context }) =>
  json(store.getGoals(context))
);

// ---------------------------------------------------------------------------
// UI TOOLS — the seam between agent reasoning and the React component registry
// ---------------------------------------------------------------------------

server.registerTool("list_components", { title: "Listar componentes disponibles", description: "Devuelve el catálogo completo de tipos de componentes de UI disponibles en el Component Registry. La IA NUNCA debe usar un tipo fuera de esta lista." }, async () =>
  json(COMPONENT_TYPES)
);

server.registerTool(
  "recommend_components",
  {
    title: "Recomendar componentes",
    description:
      "Motor de reglas que sugiere qué componentes de UI usar dado el contexto del usuario y su intención. Devuelve componentes priorizados con la razón de cada uno. Llama esto ANTES de compose_dashboard para fundamentar tu elección de UI.",
    inputSchema: {
      intent: z.enum([
        "save_for_goal",
        "inflation_check",
        "spending_review",
        "business_overview",
        "general_overview",
        "cashflow_check",
        "get_recommendations",
        "compare_periods",
        "emergency_fund_check",
        "investment_prep",
      ]),
      activeContext: contextEnum,
      goal: z.string().optional(),
      timeHorizonMonths: z.number().optional(),
    },
  },
  async ({ intent, activeContext, goal, timeHorizonMonths }) => {
    const isStudent = store.profile.isStudent;
    const isEntrepreneur = store.profile.isEntrepreneur;
    return json(
      recommendComponents({
        intent: intent as Intent,
        activeContext,
        goal,
        timeHorizonMonths,
        userContext: { student: isStudent, entrepreneur: isEntrepreneur },
      })
    );
  }
);

server.registerTool(
  "compose_dashboard",
  {
    title: "Componer dashboard",
    description:
      "Guarda la estructura declarativa completa de UI que el agente decidió generar (layout + components + narrative + dataProvenance). Esta es la ÚNICA forma válida de producir UI — nunca generes HTML/JSX. Cada componente debe usar un `type` presente en list_components.",
    inputSchema: {
      uiJson: z.string().describe("JSON.stringify del objeto UIGenerationResult completo"),
    },
  },
  async ({ uiJson }) => {
    let parsed: UIGenerationResult;
    try {
      parsed = JSON.parse(uiJson);
    } catch {
      return err("uiJson no es JSON válido");
    }
    const invalid = parsed.components?.find((c) => !isValidComponentType(c.type));
    if (invalid) return err(`Tipo de componente inválido: ${(invalid as any).type}. Usa list_components para ver los tipos válidos.`);
    store.setDashboard(parsed);
    store.setActiveContext(parsed.activeContext);
    return json({ ok: true, componentCount: parsed.components.length });
  }
);

server.registerTool("get_current_dashboard", { title: "Obtener dashboard actual", description: "Devuelve el UI JSON actualmente en pantalla, para que el agente pueda modificarlo incrementalmente en vez de recomponer todo desde cero." }, async () => {
  const dash = store.getDashboard();
  return dash ? json(dash) : json({ layout: "dashboard", activeContext: store.getActiveContext(), narrative: "", components: [], dataProvenance: { real: [], inferred: [], recommended: [] } });
});

server.registerTool(
  "remove_component",
  {
    title: "Quitar componente",
    description: "Elimina un componente del dashboard actual por id (ej. cuando el usuario dice 'quita la gráfica de inflación').",
    inputSchema: { componentId: z.string() },
  },
  async ({ componentId }) => {
    const dash = store.getDashboard();
    if (!dash) return err("No hay dashboard activo");
    dash.components = dash.components.filter((c) => c.id !== componentId);
    store.setDashboard(dash);
    return json({ ok: true, remaining: dash.components.length });
  }
);

server.registerTool(
  "move_component",
  {
    title: "Mover componente",
    description: "Cambia la prioridad (orden) de un componente en el dashboard actual.",
    inputSchema: { componentId: z.string(), newPriority: z.number() },
  },
  async ({ componentId, newPriority }) => {
    const dash = store.getDashboard();
    if (!dash) return err("No hay dashboard activo");
    const comp = dash.components.find((c) => c.id === componentId);
    if (!comp) return err(`No existe el componente ${componentId}`);
    comp.priority = newPriority;
    store.setDashboard(dash);
    return json({ ok: true });
  }
);

server.registerTool(
  "configure_component",
  {
    title: "Configurar componente",
    description: "Actualiza las props de un componente existente en el dashboard actual (merge parcial).",
    inputSchema: { componentId: z.string(), propsPatchJson: z.string().describe("JSON.stringify de un objeto parcial de props") },
  },
  async ({ componentId, propsPatchJson }) => {
    const dash = store.getDashboard();
    if (!dash) return err("No hay dashboard activo");
    const comp = dash.components.find((c) => c.id === componentId);
    if (!comp) return err(`No existe el componente ${componentId}`);
    let patch: Record<string, unknown>;
    try {
      patch = JSON.parse(propsPatchJson);
    } catch {
      return err("propsPatchJson no es JSON válido");
    }
    (comp as any).props = { ...(comp as any).props, ...patch };
    store.setDashboard(dash);
    return json({ ok: true, component: comp });
  }
);

// ---------------------------------------------------------------------------
// USER CONTEXT TOOLS
// ---------------------------------------------------------------------------

server.registerTool("get_user_profile", { title: "Obtener perfil de usuario", description: "Perfil del usuario: si es estudiante, si es emprendedor, y sus datos asociados." }, async () => json(store.profile));

server.registerTool(
  "get_user_financial_context",
  {
    title: "Obtener contexto financiero del usuario",
    description: "Snapshot agregado (cuentas, balance total, ingreso/gasto promedio, flujo, metas) para un contexto.",
    inputSchema: { context: contextEnum.optional() },
  },
  async ({ context }) => {
    const ctx = context ?? store.getActiveContext();
    const accounts = store.accounts.filter((a) => a.context === ctx);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const flow = calculateCashFlow(ctx, 3);
    const goals = store.getGoals(ctx);
    return json({ context: ctx, accounts, totalBalance, monthlyIncomeAvg: flow.income, monthlyExpensesAvg: flow.expenses, cashFlow: flow.net, goals });
  }
);

server.registerTool("get_user_preferences", { title: "Obtener preferencias de UI", description: "Preferencias de interfaz aprendidas del usuario (le interesan gráficos, KPIs, vista compacta, temas frecuentes, etc.)." }, async () => json(store.getPreferences()));

server.registerTool(
  "set_user_preference",
  {
    title: "Actualizar preferencia de UI",
    description: "Actualiza una o más preferencias de UI del usuario (merge parcial). Llama esto cuando detectes una preferencia implícita o explícita, ej. el usuario pide 'menos gráficas, más KPIs'.",
    inputSchema: {
      prefersCharts: z.boolean().optional(),
      prefersKpis: z.boolean().optional(),
      compactView: z.boolean().optional(),
      interestedInInvesting: z.boolean().optional(),
      topic: z.string().optional().describe("Tema consultado, se agrega a frequentTopics"),
    },
  },
  async ({ topic, ...rest }) => {
    if (topic) store.noteTopic(topic);
    const updated = store.setPreferences(rest);
    return json(updated);
  }
);

server.registerTool(
  "switch_financial_context",
  {
    title: "Cambiar contexto financiero activo",
    description: "Cambia el contexto activo entre 'personal' y 'business'. Úsalo cuando el usuario diga cosas como 'ahora quiero ver solo mi negocio'.",
    inputSchema: { context: contextEnum },
  },
  async ({ context }) => json({ activeContext: store.setActiveContext(context) })
);

// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mcp-server] Banorte Adaptive Finance MCP server listening on stdio");
}

main().catch((e) => {
  console.error("[mcp-server] fatal error", e);
  process.exit(1);
});
