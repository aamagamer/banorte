"use client";

import React from "react";
import type { UIComponent, UIGenerationResult } from "@hackmty/shared";
import {
  KpiCard,
  BalanceCard,
  SavingsProgress,
  CashFlowCard,
  EmergencyFundProgress,
  BusinessRevenueCard,
  LineChartCard,
  DonutChartCard,
  ComparisonChartCard,
  FinancialGoalCard,
  TransactionList,
  AiInsight,
  AiRecommendation,
  ScenarioSimulator,
  ContextSwitcher,
} from "./FinanceComponents";

interface DashboardProps {
  ui: UIGenerationResult | null;
  onRemoveComponent: (id: string) => void;
  onSwitchContext: (key: "personal" | "business") => void;
}

function renderComponent(c: UIComponent, onRemove: () => void, onSwitchContext: (k: "personal" | "business") => void) {
  const common = { key: c.id, reason: c.reason, onRemove: c.removable === false ? undefined : onRemove };
  switch (c.type) {
    case "kpi_card":
      return <KpiCard {...c} {...common} />;
    case "balance_card":
      return <BalanceCard {...c} {...common} />;
    case "savings_progress":
      return <SavingsProgress {...c} {...common} />;
    case "cash_flow_card":
      return <CashFlowCard {...c} {...common} />;
    case "emergency_fund_progress":
      return <EmergencyFundProgress {...c} {...common} />;
    case "business_revenue_card":
      return <BusinessRevenueCard {...c} {...common} />;
    case "line_chart":
      return <LineChartCard {...c} {...common} />;
    case "donut_chart":
      return <DonutChartCard {...c} {...common} />;
    case "comparison_chart":
      return <ComparisonChartCard {...c} {...common} />;
    case "financial_goal_card":
      return <FinancialGoalCard {...c} {...common} />;
    case "transaction_list":
      return <TransactionList {...c} {...common} />;
    case "ai_insight":
      return <AiInsight {...c} onRemove={common.onRemove} />;
    case "ai_recommendation":
      return <AiRecommendation {...c} onRemove={common.onRemove} />;
    case "scenario_simulator":
      return <ScenarioSimulator {...c} {...common} />;
    case "context_switcher":
      return <ContextSwitcher key={c.id} {...c} onSwitch={onSwitchContext} />;
    default:
      return null;
  }
}

// Components that read as "full width" rows rather than grid tiles.
const WIDE_TYPES = new Set(["line_chart", "comparison_chart", "transaction_list", "ai_recommendation"]);

export function Dashboard({ ui, onRemoveComponent, onSwitchContext }: DashboardProps) {
  if (!ui) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-8">
        <p>
          Escribe algo como <span className="font-medium text-gray-500">&quot;quiero saber si estoy ahorrando suficiente para comprar un auto&quot;</span> y la interfaz se
          generará aquí en tiempo real.
        </p>
      </div>
    );
  }

  const sorted = [...ui.components].sort((a, b) => a.priority - b.priority);
  const switcher = sorted.find((c) => c.type === "context_switcher");
  const rest = sorted.filter((c) => c.type !== "context_switcher");

  return (
    <div className="p-6 space-y-4">
      {switcher && <div>{renderComponent(switcher, () => onRemoveComponent(switcher.id), onSwitchContext)}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {rest.map((c) => (
          <div key={c.id} className={WIDE_TYPES.has(c.type) ? "sm:col-span-2 lg:col-span-3" : ""}>
            {renderComponent(c, () => onRemoveComponent(c.id), onSwitchContext)}
          </div>
        ))}
      </div>
      {(ui.dataProvenance.real.length > 0 || ui.dataProvenance.inferred.length > 0 || ui.dataProvenance.recommended.length > 0) && (
        <details className="text-xs text-gray-400 pt-2">
          <summary className="cursor-pointer hover:text-gray-600">Ver de dónde salen estos datos</summary>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="font-medium text-gray-500">Datos reales</p>
              <p>{ui.dataProvenance.real.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Inferencias (cálculos)</p>
              <p>{ui.dataProvenance.inferred.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="font-medium text-gray-500">Recomendaciones IA</p>
              <p>{ui.dataProvenance.recommended.join(", ") || "—"}</p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
