// ============================================================================
// ORCHESTRATOR AGENT
// ============================================================================
// Single agent, real MCP tool calling (see project ADR in README: one agent
// with well-designed tools beats five specialized agents for a hackathon —
// less integration risk, same "AI decides the interface" story).
//
// Two modes:
//  - LIVE mode (ANTHROPIC_API_KEY set): Claude does real tool-calling
//    reasoning over the MCP tool list and must finish by calling
//    compose_dashboard.
//  - FALLBACK mode (no API key): a small deterministic rule engine drives
//    the *same* MCP tools and the *same* compose_dashboard contract. This
//    exists so the product still demos (and so this codebase is testable)
//    without burning API credits or requiring network access — it is not a
//    replacement for the real agent, just a documented degradation path.

import Anthropic from "@anthropic-ai/sdk";
import { callMcpTool, listMcpToolsForAnthropic } from "./mcp-client";
import type { UIGenerationResult } from "@hackmty/shared";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResult {
  narrative: string;
  dashboard: UIGenerationResult;
  mode: "live" | "fallback";
  toolCalls: { name: string; input: unknown }[];
}

const SYSTEM_PROMPT = `Eres el agente orquestador de una interfaz financiera adaptativa para Banorte (prototipo de hackathon HackMTY).

PRINCIPIO RECTOR: no vives dentro de la interfaz, tú DECIDES cómo debe ser la interfaz. Nunca generes HTML/JSX. Tu única salida de UI válida es una llamada a la herramienta compose_dashboard con un JSON que cumpla el protocolo UIGenerationResult.

Tu proceso para cada mensaje del usuario:
1. Interpreta la intención financiera real detrás del mensaje (puede estar en español informal).
2. Decide qué datos necesitas y llama las herramientas MCP de datos/análisis/económicas/producto que correspondan. Nunca inventes cifras — todo número que muestres debe venir de una llamada a herramienta.
3. Llama get_user_financial_context y get_user_preferences si te ayudan a personalizar.
4. Llama recommend_components para fundamentar qué componentes usar (puedes ajustar su sugerencia con tu propio juicio, pero no ignores el catálogo de list_components).
5. Si el usuario pide modificar un dashboard existente ("quita X", "agrega Y", "mueve Z"), primero llama get_current_dashboard y luego usa remove_component/move_component/configure_component o vuelve a llamar compose_dashboard con la lista de componentes ya fusionada — nunca reconstruyas de cero algo que el usuario no pidió cambiar.
6. Si el usuario pide cambiar de contexto (personal/negocio), llama switch_financial_context.
7. Termina SIEMPRE llamando compose_dashboard con el resultado final (layout, activeContext, narrative, components, dataProvenance). El campo narrative debe ser la explicación en español que verá el usuario en el chat — clara, breve, basada en los datos reales que obtuviste.
8. Separa explícitamente en dataProvenance: "real" (datos crudos de herramientas), "inferred" (cálculos/derivaciones), "recommended" (sugerencias de la IA). Nunca presentes una recomendación como certeza.
9. Si generas recomendaciones financieras (ai_recommendation), incluye siempre un disclaimer breve: esto es orientativo, no asesoría financiera personalizada garantizada.
10. Sé conciso. El usuario ve tu narrative en un chat, no un ensayo.

Cuando termines de llamar compose_dashboard, responde con un texto final breve confirmando en 1-2 frases qué preparaste (este texto y el narrative pueden ser iguales).`;

// ---------------------------------------------------------------------------
// LIVE MODE — real Claude tool-calling loop
// ---------------------------------------------------------------------------

async function runLiveAgent(userMessage: string, history: ChatTurn[]): Promise<AgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
  const tools = await listMcpToolsForAnthropic();

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content }) as Anthropic.Messages.MessageParam),
    { role: "user", content: userMessage },
  ];

  const toolCalls: { name: string; input: unknown }[] = [];
  let finalText = "";

  for (let iteration = 0; iteration < 8; iteration++) {
    const resp = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Messages.Tool.InputSchema })),
      messages,
    });

    messages.push({ role: "assistant", content: resp.content });
    const toolUses = resp.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");

    if (toolUses.length === 0) {
      finalText = resp.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    const toolResultBlocks: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      toolCalls.push({ name: tu.name, input: tu.input });
      const { text, isError } = await callMcpTool(tu.name, tu.input as Record<string, unknown>);
      toolResultBlocks.push({ type: "tool_result", tool_use_id: tu.id, content: text, is_error: isError });
    }
    messages.push({ role: "user", content: toolResultBlocks });
  }

  const dashboardRaw = await callMcpTool("get_current_dashboard", {});
  const dashboard: UIGenerationResult = JSON.parse(dashboardRaw.text);
  return { narrative: finalText || dashboard.narrative, dashboard, mode: "live", toolCalls };
}

// ---------------------------------------------------------------------------
// FALLBACK MODE — deterministic rule engine, same MCP tools, same contract
// ---------------------------------------------------------------------------

function detectIntent(msg: string): "save_for_goal" | "inflation" | "business_only" | "recommendations" | "spending_review" | "general" {
  const m = msg.toLowerCase();
  if (/(inflaci)/.test(m)) return "inflation";
  if (/(recomien|recomend|consejo|sugier|qu[eé] hago|qu[eé] debo hacer)/.test(m)) return "recommendations";
  if (/(solo.*negocio|s[oó]lo.*negocio|nada m[aá]s.*negocio|\bmi negocio\b.*\bsolo\b|ver.*negocio)/.test(m)) return "business_only";
  if (/(gast[eé]|gasto|categor[ií]a|comida)/.test(m)) return "spending_review";
  if (/(ahorr|meta|comprar|autom[oó]vil|carro)/.test(m)) return "save_for_goal";
  return "general";
}

async function runFallbackAgent(userMessage: string, _history: ChatTurn[]): Promise<AgentResult> {
  const toolCalls: { name: string; input: unknown }[] = [];
  const call = async (name: string, input: Record<string, unknown> = {}) => {
    toolCalls.push({ name, input });
    const r = await callMcpTool(name, input);
    return JSON.parse(r.text);
  };

  const intent = detectIntent(userMessage);
  let ui: UIGenerationResult;

  if (intent === "business_only") {
    await call("switch_financial_context", { context: "business" });
    const ctx = await call("get_user_financial_context", { context: "business" });
    const spend = await call("calculate_spending_by_category", { context: "business", months: 3 });
    const txs = await call("get_transactions", { context: "business", months: 1 });
    const rec = await call("recommend_components", { intent: "business_overview", activeContext: "business" });
    ui = {
      layout: "dashboard",
      activeContext: "business",
      narrative: `Aquí está solo tu negocio: ingreso promedio de $${ctx.monthlyIncomeAvg.toLocaleString("es-MX")}/mes, gasto de $${ctx.monthlyExpensesAvg.toLocaleString("es-MX")}/mes, flujo neto de $${ctx.cashFlow.toLocaleString("es-MX")}/mes.`,
      components: [
        { id: "biz-revenue", type: "business_revenue_card", priority: 1, props: { title: "Café Nómada — resumen", revenue: ctx.monthlyIncomeAvg, expenses: ctx.monthlyExpensesAvg, profit: ctx.cashFlow } },
        { id: "biz-spend-donut", type: "donut_chart", priority: 2, props: { title: "Gasto operativo por categoría", slices: spend.breakdown.map((b: any) => ({ label: b.category, value: b.amount })) } },
        { id: "biz-tx-list", type: "transaction_list", priority: 3, props: { title: "Movimientos recientes", transactions: txs.slice(0, 8).map((t: any) => ({ date: t.date, description: t.description, amount: t.amount, category: t.category })) } },
      ],
      dataProvenance: { real: ["accounts", "transactions"], inferred: ["cash_flow", "spending_by_category"], recommended: [] },
    };
    void rec;
  } else if (intent === "inflation") {
    const inflation = await call("get_inflation");
    const savingsRate = await call("calculate_savings_rate", { context: "personal", months: 6 });
    const goal = (await call("list_goals", { context: "personal" }))[0];
    const scenario = goal ? await call("simulate_savings_scenario", { goalId: goal.id, monthlyContribution: goal.targetAmount && goal.currentAmount ? Math.round((goal.targetAmount - goal.currentAmount) / 10) : 3000 }) : null;
    const realGrowthPct = savingsRate.savingsRatePct - inflation.value;
    ui = {
      layout: "dashboard",
      activeContext: "personal",
      narrative: `Tu tasa de ahorro es ${savingsRate.savingsRatePct}% mientras que la inflación reportada es ${inflation.value}%. En términos reales tu poder adquisitivo cambió aproximadamente ${realGrowthPct.toFixed(1)}%.`,
      components: [
        { id: "kpi-savings-rate", type: "kpi_card", priority: 1, props: { title: "Tasa de ahorro (nominal)", value: savingsRate.savingsRatePct, format: "percent", icon: "trend-up" } },
        { id: "kpi-inflation", type: "kpi_card", priority: 2, props: { title: "Inflación anual (INPC)", value: inflation.value, format: "percent", icon: "percent" } },
        ...(scenario
          ? [{ id: "line-savings-vs-inflation", type: "line_chart" as const, priority: 3, props: { title: "Ahorro proyectado vs. inflación", series: [{ name: "Ahorro acumulado", data: scenario.projectionSeries }], yFormat: "currency" as const } }]
          : []),
        { id: "ai-insight-inflation", type: "ai_insight", priority: 4, props: { title: "Poder adquisitivo real", message: `Tu ahorro real (ajustado por inflación) cambió ${realGrowthPct.toFixed(1)}% en el periodo analizado. ${realGrowthPct >= 0 ? "Vas ganando terreno frente a la inflación." : "La inflación está erosionando tu ahorro más rápido de lo que crece."}`, tone: realGrowthPct >= 0 ? "positive" : "warning", basedOn: ["calculate_savings_rate", "get_inflation"] } },
      ],
      dataProvenance: { real: ["get_inflation"], inferred: ["calculate_savings_rate", "simulate_savings_scenario"], recommended: [] },
    };
  } else if (intent === "recommendations") {
    const ef = await call("calculate_emergency_fund", { context: "personal" });
    const health = await call("calculate_financial_health", { context: "personal" });
    const bizFlow = await call("calculate_cash_flow", { context: "business", months: 3 });
    const recs = [
      { text: "Aumenta tu ahorro mensual dedicado a tu meta de automóvil.", rationale: "Tu ritmo actual está por debajo de lo necesario para llegar a tiempo (calculate_goal_projection)." },
      { text: `Lleva tu fondo de emergencia personal de ${ef.monthsCovered} a ${ef.targetMonths} meses de gasto cubierto.`, rationale: "Como tus ingresos de negocio son variables, un colchón más grande te protege de meses flojos (calculate_emergency_fund)." },
      { text: bizFlow.net < 0 ? "Revisa el gasto en insumos/marketing del negocio este trimestre — el flujo del negocio fue negativo." : "Mantén el margen actual del negocio, va estable.", rationale: "calculate_cash_flow del contexto negocio de los últimos 3 meses." },
      { text: "Separa explícitamente el flujo personal del empresarial (cuentas distintas, transferencias programadas).", rationale: "Buenas prácticas para emprendedores con doble contexto financiero." },
    ];
    ui = {
      layout: "dashboard",
      activeContext: "personal",
      narrative: `Con base en tu contexto (score financiero: ${health.score}/100, ${health.label}), aquí van ${recs.length} recomendaciones. No son asesoría financiera personalizada garantizada — son orientación basada en tus datos.`,
      components: [
        { id: "ai-recs", type: "ai_recommendation", priority: 1, props: { recommendations: recs, disclaimer: "Estas sugerencias son orientativas y se basan en datos simulados de demo; no constituyen asesoría financiera personalizada." } },
        { id: "ef-progress", type: "emergency_fund_progress", priority: 2, props: { title: "Fondo de emergencia personal", monthsCovered: ef.monthsCovered, monthsTarget: ef.targetMonths, currentAmount: ef.liquidAssets, targetAmount: ef.targetAmount } },
      ],
      dataProvenance: { real: ["accounts"], inferred: ["calculate_emergency_fund", "calculate_financial_health", "calculate_cash_flow"], recommended: ["ai_recommendation"] },
    };
  } else if (intent === "spending_review") {
    const spend = await call("calculate_spending_by_category", { context: "personal", months: 3 });
    ui = {
      layout: "dashboard",
      activeContext: "personal",
      narrative: `Tu categoría de mayor gasto es ${spend.breakdown[0]?.category ?? "N/A"} con un promedio mensual de $${spend.breakdown[0]?.amount?.toLocaleString("es-MX")}.`,
      components: [
        { id: "spend-donut", type: "donut_chart", priority: 1, props: { title: "Gasto por categoría (3 meses)", slices: spend.breakdown.map((b: any) => ({ label: b.category, value: b.amount })) } },
        { id: "ai-insight-spend", type: "ai_insight", priority: 2, props: { message: `La categoría "${spend.breakdown[0]?.category}" representa ${spend.breakdown[0]?.pctOfTotal}% de tu gasto mensual.`, basedOn: ["calculate_spending_by_category"] } },
      ],
      dataProvenance: { real: ["transactions"], inferred: ["calculate_spending_by_category"], recommended: [] },
    };
  } else if (intent === "save_for_goal") {
    const goal = (await call("list_goals", { context: "personal" }))[0];
    // Use a 6-month window for "real capacity" — 3 months can land squarely on
    // a semester's tuition lump and understate how much the user can actually
    // save in a typical month.
    const flow3 = await call("calculate_cash_flow", { context: "personal", months: 3 });
    const flow6 = await call("calculate_cash_flow", { context: "personal", months: 6 });
    const projection = goal ? await call("calculate_goal_projection", { goalId: goal.id }) : null;
    // onTrack must compare what's NEEDED against what the user can ACTUALLY
    // save today — never against a hypothetical equal to the need itself.
    const onTrack = projection ? flow6.net >= projection.neededMonthlyContribution * 0.95 : false;
    const gapPerMonth = projection ? Math.max(0, projection.neededMonthlyContribution - flow6.net) : 0;
    ui = {
      layout: "dashboard",
      activeContext: "personal",
      narrative: goal
        ? `Vas al ${projection.progressPct}% de tu meta "${goal.name}". Necesitas ahorrar ~$${projection.neededMonthlyContribution.toLocaleString("es-MX")}/mes para llegar a tiempo (${projection.monthsLeft} meses restantes) y tu capacidad real de ahorro hoy es de ~$${flow6.net.toLocaleString("es-MX")}/mes.`
        : "No tienes una meta activa todavía — puedo ayudarte a crear una.",
      components: goal
        ? [
            { id: "goal-card", type: "financial_goal_card", priority: 1, props: { name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, targetDate: goal.targetDate, status: goal.status } },
            { id: "goal-progress", type: "savings_progress", priority: 2, props: { title: goal.name, currentAmount: goal.currentAmount, targetAmount: goal.targetAmount, targetDate: goal.targetDate, monthlyContributionNeeded: projection.neededMonthlyContribution } },
            { id: "goal-cashflow", type: "cash_flow_card", priority: 3, props: { title: "Flujo mensual personal", income: flow3.income, expenses: flow3.expenses, net: flow3.net, period: "promedio 3 meses" } },
            {
              id: "goal-simulator",
              type: "scenario_simulator",
              priority: 4,
              props: {
                title: "¿Qué pasa si ahorro más?",
                baseMonthlyContribution: Math.max(500, flow6.net),
                goalName: goal.name,
                targetAmount: goal.targetAmount,
                currentAmount: goal.currentAmount,
                monthsRemaining: projection.monthsLeft,
                minContribution: 500,
                maxContribution: Math.max(3000, projection.neededMonthlyContribution * 2),
                stepSize: 250,
              },
            },
            {
              id: "goal-insight",
              type: "ai_insight",
              priority: 5,
              props: {
                message: onTrack
                  ? "Con tu capacidad de ahorro actual vas a buen ritmo para alcanzar tu meta a tiempo."
                  : `Estás ahorrando por debajo del ritmo necesario: te faltan ~$${gapPerMonth.toLocaleString("es-MX")}/mes para llegar a tiempo a tu meta.`,
                tone: onTrack ? "positive" : "warning",
                basedOn: ["calculate_goal_projection", "calculate_cash_flow"],
              },
            },
          ]
        : [],
      dataProvenance: { real: ["goals", "accounts"], inferred: ["calculate_goal_projection", "calculate_cash_flow"], recommended: [] },
    };
  } else {
    const personal = await call("get_user_financial_context", { context: "personal" });
    const business = await call("get_user_financial_context", { context: "business" });
    ui = {
      layout: "dashboard",
      activeContext: "personal",
      narrative: `Detecté que manejas tus finanzas personales y también la operación de un pequeño negocio. Personal: $${personal.totalBalance.toLocaleString("es-MX")}. Negocio: $${business.totalBalance.toLocaleString("es-MX")}. Flujo personal: ${personal.cashFlow >= 0 ? "+" : ""}$${personal.cashFlow.toLocaleString("es-MX")}/mes.`,
      components: [
        { id: "ctx-switcher", type: "context_switcher", priority: 0, props: { options: [{ key: "personal", label: "Mi vida" }, { key: "business", label: "Mi negocio" }], active: "personal" } },
        { id: "kpi-personal-balance", type: "kpi_card", priority: 1, props: { title: "Personal", value: personal.totalBalance, format: "currency", icon: "wallet" } },
        { id: "kpi-business-balance", type: "kpi_card", priority: 2, props: { title: "Negocio", value: business.totalBalance, format: "currency", icon: "wallet" } },
        { id: "kpi-savings", type: "kpi_card", priority: 3, props: { title: "Ahorro (cuenta de ahorro)", value: personal.accounts.find((a: any) => a.type === "savings")?.balance ?? 0, format: "currency", icon: "trend-up" } },
        { id: "kpi-flow", type: "kpi_card", priority: 4, props: { title: "Flujo mensual personal", value: personal.cashFlow, format: "currency", trend: undefined, icon: personal.cashFlow >= 0 ? "trend-up" : "trend-down" } },
      ],
      dataProvenance: { real: ["accounts"], inferred: ["get_user_financial_context"], recommended: [] },
    };
  }

  await call("compose_dashboard", { uiJson: JSON.stringify(ui) });
  return { narrative: ui.narrative, dashboard: ui, mode: "fallback", toolCalls };
}

// ---------------------------------------------------------------------------

export async function runAgentTurn(userMessage: string, history: ChatTurn[] = []): Promise<AgentResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    return runLiveAgent(userMessage, history);
  }
  return runFallbackAgent(userMessage, history);
}
