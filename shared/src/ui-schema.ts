// ============================================================================
// UI GENERATION PROTOCOL
// ============================================================================
// This is what the agent MUST return to drive the frontend. The LLM never
// emits HTML/JSX — it emits this declarative JSON. The React app maps
// component.type -> a component from the registry (see web/src/components).
// This is the seam that keeps "AI decides the interface" separate from
// "React renders the interface" (principio rector del proyecto).

export const COMPONENT_TYPES = [
  // Indicadores
  "kpi_card",
  "balance_card",
  "savings_progress",
  "cash_flow_card",
  "emergency_fund_progress",
  "business_revenue_card",
  // Visualización
  "line_chart",
  "donut_chart",
  "comparison_chart",
  // Financieros
  "financial_goal_card",
  "transaction_list",
  // Inteligentes
  "ai_insight",
  "ai_recommendation",
  "scenario_simulator",
  // Interacción
  "context_switcher",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export interface BaseComponent {
  id: string; // stable id, used for update/remove/move
  type: ComponentType;
  priority: number; // render order, lower = higher on the dashboard
  reason?: string; // internal justification from recommend_components — shown in "why am I seeing this"
  removable?: boolean; // default true
}

export interface KpiCardProps extends BaseComponent {
  type: "kpi_card";
  props: {
    title: string;
    value: number;
    format?: "currency" | "percent" | "number";
    trend?: number; // % change vs previous period
    trendLabel?: string;
    icon?: "wallet" | "trend-up" | "trend-down" | "percent" | "target";
  };
}

export interface BalanceCardProps extends BaseComponent {
  type: "balance_card";
  props: {
    title: string;
    accounts: { name: string; balance: number; type: string }[];
    total: number;
  };
}

export interface SavingsProgressProps extends BaseComponent {
  type: "savings_progress";
  props: {
    title: string;
    currentAmount: number;
    targetAmount: number;
    targetDate: string;
    monthlyContributionNeeded?: number;
  };
}

export interface CashFlowCardProps extends BaseComponent {
  type: "cash_flow_card";
  props: {
    title: string;
    income: number;
    expenses: number;
    net: number;
    period: string;
  };
}

export interface EmergencyFundProgressProps extends BaseComponent {
  type: "emergency_fund_progress";
  props: {
    title: string;
    monthsCovered: number;
    monthsTarget: number;
    currentAmount: number;
    targetAmount: number;
  };
}

export interface BusinessRevenueCardProps extends BaseComponent {
  type: "business_revenue_card";
  props: {
    title: string;
    revenue: number;
    expenses: number;
    profit: number;
    trend?: number;
  };
}

export interface LineChartProps extends BaseComponent {
  type: "line_chart";
  props: {
    title: string;
    series: { name: string; color?: string; data: { x: string; y: number }[] }[];
    yFormat?: "currency" | "percent" | "number";
  };
}

export interface DonutChartProps extends BaseComponent {
  type: "donut_chart";
  props: {
    title: string;
    slices: { label: string; value: number }[];
    centerLabel?: string;
  };
}

export interface ComparisonChartProps extends BaseComponent {
  type: "comparison_chart";
  props: {
    title: string;
    categories: string[];
    series: { name: string; values: number[] }[];
    yFormat?: "currency" | "percent" | "number";
  };
}

export interface FinancialGoalCardProps extends BaseComponent {
  type: "financial_goal_card";
  props: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    status: "on_track" | "behind" | "ahead" | "completed";
  };
}

export interface TransactionListProps extends BaseComponent {
  type: "transaction_list";
  props: {
    title: string;
    transactions: {
      date: string;
      description: string;
      amount: number;
      category: string;
    }[];
  };
}

export interface AiInsightProps extends BaseComponent {
  type: "ai_insight";
  props: {
    title?: string;
    message: string;
    tone?: "neutral" | "positive" | "warning";
    basedOn: string[]; // which real data points this insight came from ("datos reales")
  };
}

export interface AiRecommendationProps extends BaseComponent {
  type: "ai_recommendation";
  props: {
    title?: string;
    recommendations: { text: string; rationale: string }[];
    disclaimer?: string; // required disclaimer text for financial advice
  };
}

export interface ScenarioSimulatorProps extends BaseComponent {
  type: "scenario_simulator";
  props: {
    title: string;
    baseMonthlyContribution: number;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
    monthsRemaining: number;
    minContribution: number;
    maxContribution: number;
    stepSize: number;
  };
}

export interface ContextSwitcherProps extends BaseComponent {
  type: "context_switcher";
  props: {
    options: { key: "personal" | "business"; label: string }[];
    active: "personal" | "business";
  };
}

export type UIComponent =
  | KpiCardProps
  | BalanceCardProps
  | SavingsProgressProps
  | CashFlowCardProps
  | EmergencyFundProgressProps
  | BusinessRevenueCardProps
  | LineChartProps
  | DonutChartProps
  | ComparisonChartProps
  | FinancialGoalCardProps
  | TransactionListProps
  | AiInsightProps
  | AiRecommendationProps
  | ScenarioSimulatorProps
  | ContextSwitcherProps;

export type LayoutKind = "dashboard" | "focus" | "comparison";

// This is the EXACT JSON shape the agent must produce (via the compose_dashboard
// / update_dashboard MCP tools) and that the /api/chat route returns to the client.
export interface UIGenerationResult {
  layout: LayoutKind;
  activeContext: "personal" | "business";
  narrative: string; // what the AI says in the chat bubble, in Spanish
  components: UIComponent[];
  dataProvenance: {
    real: string[]; // facts pulled straight from MCP data tools
    inferred: string[]; // derived/calculated by analysis tools
    recommended: string[]; // AI-generated suggestions, never presented as certainty
  };
}

export function isValidComponentType(t: string): t is ComponentType {
  return (COMPONENT_TYPES as readonly string[]).includes(t);
}
