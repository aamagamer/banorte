"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { money, pct, formatValue, shortMonth, categoryLabel } from "./format";
import type {
  KpiCardProps,
  BalanceCardProps,
  SavingsProgressProps,
  CashFlowCardProps,
  EmergencyFundProgressProps,
  BusinessRevenueCardProps,
  LineChartProps,
  DonutChartProps,
  ComparisonChartProps,
  FinancialGoalCardProps,
  TransactionListProps,
  AiInsightProps,
  AiRecommendationProps,
  ScenarioSimulatorProps,
  ContextSwitcherProps,
} from "@hackmty/shared";

// Fixed categorical order — validated palette (dataviz skill). Never cycled,
// never reassigned by rank: series 1 is always blue, series 2 always orange…
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const MUTED = "#898781";
const GRID = "#e1e0d9";
const INK = "#0b0b0b";
const SECONDARY_INK = "#52514e";

// ---------------------------------------------------------------------------
// Shared shell
// ---------------------------------------------------------------------------
function CardShell({
  title,
  reason,
  onRemove,
  children,
}: {
  title?: string;
  reason?: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card group relative h-full">
      {onRemove && (
        <button
          onClick={onRemove}
          title="Quitar de mi vista"
          className="absolute top-3 right-3 h-6 w-6 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition text-sm"
        >
          ×
        </button>
      )}
      {title && <h3 className="text-sm font-semibold text-gray-700 mb-3 pr-6">{title}</h3>}
      {reason && (
        <p className="text-[11px] text-gray-400 mb-2 -mt-2 italic" title="Por qué te muestro esto">
          {reason}
        </p>
      )}
      {children}
    </div>
  );
}

const ICONS: Record<string, string> = {
  wallet: "💼",
  "trend-up": "📈",
  "trend-down": "📉",
  percent: "%",
  target: "🎯",
};

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------
export function KpiCard({ props, reason, onRemove }: KpiCardProps & { reason?: string; onRemove?: () => void }) {
  const trendPositive = (props.trend ?? 0) >= 0;
  return (
    <CardShell reason={reason} onRemove={onRemove}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{props.title}</p>
        {props.icon && <span className="text-lg">{ICONS[props.icon] ?? ""}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{formatValue(props.value, props.format)}</p>
      {props.trend !== undefined && (
        <p className={`mt-1 text-xs font-medium ${trendPositive ? "text-emerald-700" : "text-red-700"}`}>
          {trendPositive ? "▲" : "▼"} {Math.abs(props.trend).toFixed(1)}% {props.trendLabel ?? "vs. periodo anterior"}
        </p>
      )}
    </CardShell>
  );
}

export function BalanceCard({ props, reason, onRemove }: BalanceCardProps & { reason?: string; onRemove?: () => void }) {
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <p className="text-2xl font-bold text-gray-900 mb-3">{money(props.total)}</p>
      <ul className="space-y-1.5">
        {props.accounts.map((a, i) => (
          <li key={i} className="flex justify-between text-sm text-gray-600">
            <span>{a.name}</span>
            <span className="font-medium text-gray-800">{money(a.balance)}</span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

export function SavingsProgress({ props, reason, onRemove }: SavingsProgressProps & { reason?: string; onRemove?: () => void }) {
  const progress = Math.min(100, (props.currentAmount / props.targetAmount) * 100);
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-gray-900">{pct(progress)}</span>
        <span className="text-xs text-gray-500">
          {money(props.currentAmount)} de {money(props.targetAmount)}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: CATEGORICAL[0] }} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        <span>Meta: {new Date(props.targetDate).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
        {props.monthlyContributionNeeded !== undefined && <span>Necesitas {money(props.monthlyContributionNeeded)}/mes</span>}
      </div>
    </CardShell>
  );
}

export function CashFlowCard({ props, reason, onRemove }: CashFlowCardProps & { reason?: string; onRemove?: () => void }) {
  const positive = props.net >= 0;
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <p className={`text-2xl font-bold ${positive ? "text-emerald-700" : "text-red-700"}`}>
        {positive ? "+" : ""}
        {money(props.net)}
      </p>
      <p className="text-xs text-gray-500 mb-3">{props.period}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Ingreso</p>
          <p className="font-medium text-gray-800">{money(props.income)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Gasto</p>
          <p className="font-medium text-gray-800">{money(props.expenses)}</p>
        </div>
      </div>
    </CardShell>
  );
}

export function EmergencyFundProgress({ props, reason, onRemove }: EmergencyFundProgressProps & { reason?: string; onRemove?: () => void }) {
  const progress = Math.min(100, (props.monthsCovered / props.monthsTarget) * 100);
  const ok = props.monthsCovered >= props.monthsTarget;
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-gray-900">
          {props.monthsCovered} / {props.monthsTarget} meses
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {ok ? "cubierto" : "en progreso"}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: ok ? "#0ca30c" : "#eda100" }} />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {money(props.currentAmount)} líquidos de {money(props.targetAmount)} objetivo
      </p>
    </CardShell>
  );
}

export function BusinessRevenueCard({ props, reason, onRemove }: BusinessRevenueCardProps & { reason?: string; onRemove?: () => void }) {
  const positive = props.profit >= 0;
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Ingreso</p>
          <p className="font-semibold text-gray-800">{money(props.revenue)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Gasto</p>
          <p className="font-semibold text-gray-800">{money(props.expenses)}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Utilidad</p>
          <p className={`font-semibold ${positive ? "text-emerald-700" : "text-red-700"}`}>{money(props.profit)}</p>
        </div>
      </div>
      {props.trend !== undefined && (
        <p className={`mt-3 text-xs font-medium ${props.trend >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          {props.trend >= 0 ? "▲" : "▼"} {Math.abs(props.trend).toFixed(1)}% vs. periodo anterior
        </p>
      )}
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Visualización
// ---------------------------------------------------------------------------
export function LineChartCard({ props, reason, onRemove }: LineChartProps & { reason?: string; onRemove?: () => void }) {
  const xs = props.series[0]?.data.map((d) => d.x) ?? [];
  const merged = xs.map((x) => {
    const row: Record<string, any> = { x: shortMonth(x) };
    props.series.forEach((s) => {
      row[s.name] = s.data.find((d) => d.x === x)?.y;
    });
    return row;
  });
  const showLegend = props.series.length > 1;
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="x" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: MUTED }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) => (props.yFormat === "percent" ? `${v}%` : new Intl.NumberFormat("es-MX", { notation: "compact" }).format(v))}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid " + GRID, fontSize: 12 }}
              formatter={(v: any) => (props.yFormat === "percent" ? pct(Number(v)) : money(Number(v)))}
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {props.series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color ?? CATEGORICAL[i % CATEGORICAL.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

export function DonutChartCard({ props, reason, onRemove }: DonutChartProps & { reason?: string; onRemove?: () => void }) {
  const total = props.slices.reduce((s, x) => s + x.value, 0);
  const MAX_SLICES = 6;
  const sorted = [...props.slices].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const data = rest.length ? [...top, { label: "Otros", value: rest.reduce((s, x) => s + x.value, 0) }] : top;

  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <div className="h-56 flex items-center">
        <ResponsiveContainer width="60%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === data.length - 1 && rest.length ? MUTED : CATEGORICAL[i % CATEGORICAL.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any, n: any) => [money(Number(v)), n === "Otros" ? n : categoryLabel(String(n))]} contentStyle={{ borderRadius: 8, border: "1px solid " + GRID, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 pl-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-600 truncate">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: i === data.length - 1 && rest.length ? MUTED : CATEGORICAL[i % CATEGORICAL.length] }} />
                {d.label === "Otros" ? d.label : categoryLabel(d.label)}
              </span>
              <span className="font-medium text-gray-800 shrink-0 ml-2">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

export function ComparisonChartCard({ props, reason, onRemove }: ComparisonChartProps & { reason?: string; onRemove?: () => void }) {
  const data = props.categories.map((cat, i) => {
    const row: Record<string, any> = { category: cat };
    props.series.forEach((s) => (row[s.name] = s.values[i]));
    return row;
  });
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => new Intl.NumberFormat("es-MX", { notation: "compact" }).format(v)} />
            <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid " + GRID, fontSize: 12 }} />
            {props.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {props.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={CATEGORICAL[i % CATEGORICAL.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Financieros
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  on_track: { label: "en ritmo", cls: "bg-emerald-50 text-emerald-700" },
  behind: { label: "atrasada", cls: "bg-amber-50 text-amber-700" },
  ahead: { label: "adelantada", cls: "bg-emerald-50 text-emerald-700" },
  completed: { label: "completada", cls: "bg-blue-50 text-blue-700" },
};

export function FinancialGoalCard({ props, reason, onRemove }: FinancialGoalCardProps & { reason?: string; onRemove?: () => void }) {
  const progress = Math.min(100, (props.currentAmount / props.targetAmount) * 100);
  const status = STATUS_LABEL[props.status] ?? STATUS_LABEL.on_track;
  return (
    <CardShell reason={reason} onRemove={onRemove}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500">Meta financiera</p>
          <h3 className="text-base font-semibold text-gray-900">{props.name}</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: CATEGORICAL[0] }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          {money(props.currentAmount)} / {money(props.targetAmount)}
        </span>
        <span>{new Date(props.targetDate).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
      </div>
    </CardShell>
  );
}

export function TransactionList({ props, reason, onRemove }: TransactionListProps & { reason?: string; onRemove?: () => void }) {
  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto scrollbar-thin">
        {props.transactions.map((t, i) => (
          <li key={i} className="flex items-center justify-between py-2 text-sm">
            <div className="min-w-0">
              <p className="text-gray-800 truncate">{t.description}</p>
              <p className="text-xs text-gray-400">
                {new Date(t.date).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })} · {categoryLabel(t.category)}
              </p>
            </div>
            <span className={`font-medium shrink-0 ml-3 ${t.amount >= 0 ? "text-emerald-700" : "text-gray-800"}`}>
              {t.amount >= 0 ? "+" : ""}
              {money(t.amount)}
            </span>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Componentes inteligentes
// ---------------------------------------------------------------------------
const TONE_STYLE: Record<string, string> = {
  neutral: "bg-gray-50 border-gray-200 text-gray-700",
  positive: "bg-emerald-50 border-emerald-200 text-emerald-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

export function AiInsight({ props, onRemove }: AiInsightProps & { onRemove?: () => void }) {
  return (
    <div className={`relative rounded-2xl border p-4 group ${TONE_STYLE[props.tone ?? "neutral"]}`}>
      {onRemove && (
        <button onClick={onRemove} className="absolute top-3 right-3 h-6 w-6 rounded-full text-current opacity-40 hover:opacity-100 text-sm">
          ×
        </button>
      )}
      <div className="flex items-start gap-2 pr-6">
        <span className="text-base">✨</span>
        <div>
          {props.title && <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{props.title}</p>}
          <p className="text-sm leading-relaxed">{props.message}</p>
          {props.basedOn?.length > 0 && <p className="mt-2 text-[11px] opacity-60">Basado en: {props.basedOn.join(", ")}</p>}
        </div>
      </div>
    </div>
  );
}

export function AiRecommendation({ props, onRemove }: AiRecommendationProps & { onRemove?: () => void }) {
  return (
    <CardShell title={props.title ?? "Recomendaciones"} onRemove={onRemove}>
      <ol className="space-y-3">
        {props.recommendations.map((r, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="shrink-0 h-5 w-5 rounded-full bg-banorte-red/10 text-banorte-red text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
            <div>
              <p className="text-sm font-medium text-gray-800">{r.text}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.rationale}</p>
            </div>
          </li>
        ))}
      </ol>
      {props.disclaimer && <p className="mt-3 text-[11px] text-gray-400 border-t border-gray-100 pt-2">⚠️ {props.disclaimer}</p>}
    </CardShell>
  );
}

export function ScenarioSimulator({ props, reason, onRemove }: ScenarioSimulatorProps & { reason?: string; onRemove?: () => void }) {
  const [contribution, setContribution] = useState(props.baseMonthlyContribution);
  const remaining = Math.max(0, props.targetAmount - props.currentAmount);
  const monthsToReach = contribution > 0 ? Math.ceil(remaining / contribution) : Infinity;
  const willMakeIt = monthsToReach <= props.monthsRemaining;

  return (
    <CardShell title={props.title} reason={reason} onRemove={onRemove}>
      <p className="text-xs text-gray-500 mb-1">Meta: {props.goalName}</p>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-2xl font-bold text-gray-900">{money(contribution)}/mes</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${willMakeIt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {Number.isFinite(monthsToReach) ? `${monthsToReach} meses para llegar` : "—"}
        </span>
      </div>
      <input
        type="range"
        min={props.minContribution}
        max={props.maxContribution}
        step={props.stepSize}
        value={contribution}
        onChange={(e) => setContribution(Number(e.target.value))}
        className="w-full accent-banorte-red"
      />
      <div className="flex justify-between text-[11px] text-gray-400 mt-1">
        <span>{money(props.minContribution)}</span>
        <span>{money(props.maxContribution)}</span>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Con {money(contribution)}/mes {willMakeIt ? "alcanzas tu meta a tiempo" : `necesitarías ${monthsToReach - props.monthsRemaining} mes(es) adicionales`} (quedan {props.monthsRemaining} meses).
      </p>
    </CardShell>
  );
}

export function ContextSwitcher({ props, onSwitch }: ContextSwitcherProps & { onSwitch?: (key: "personal" | "business") => void }) {
  return (
    <div className="inline-flex rounded-full bg-gray-100 p-1">
      {props.options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSwitch?.(opt.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            props.active === opt.key ? "bg-white text-banorte-red shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
