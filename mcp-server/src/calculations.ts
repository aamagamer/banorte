import type { Transaction, FinancialGoal } from "@hackmty/shared";
import { store } from "./store.js";

function monthKey(date: string) {
  return date.slice(0, 7); // YYYY-MM
}

function lastNMonthKeys(n: number, from = new Date("2026-09-10")) {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from);
    d.setMonth(d.getMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys; // most recent first
}

function txForContext(context?: "personal" | "business") {
  return context ? store.transactions.filter((t) => t.context === context) : store.transactions;
}

export function groupByMonth(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const k = monthKey(t.date);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  return map;
}

export function calculateCashFlow(context?: "personal" | "business", months = 1) {
  const keys = lastNMonthKeys(months);
  const txs = txForContext(context).filter((t) => keys.includes(monthKey(t.date)));
  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  return {
    context: context ?? "all",
    periodMonths: months,
    income: Math.round(income / months),
    expenses: Math.round(Math.abs(expenses) / months),
    net: Math.round((income + expenses) / months),
  };
}

export function calculateSavingsRate(context: "personal" | "business" = "personal", months = 3) {
  const { income, net } = calculateCashFlow(context, months);
  const rate = income > 0 ? Math.max(0, (net / income) * 100) : 0;
  return { context, periodMonths: months, savingsRatePct: Math.round(rate * 10) / 10, monthlyIncomeAvg: income, monthlyNetAvg: net };
}

export function calculateSpendingByCategory(context?: "personal" | "business", months = 3) {
  const keys = lastNMonthKeys(months);
  const txs = txForContext(context).filter((t) => t.amount < 0 && keys.includes(monthKey(t.date)));
  const byCat = new Map<string, number>();
  for (const t of txs) byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amount));
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);
  const breakdown = [...byCat.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount / months), pctOfTotal: Math.round((amount / total) * 1000) / 10 }))
    .sort((a, b) => b.amount - a.amount);
  return { context: context ?? "all", periodMonths: months, totalMonthlyAvg: Math.round(total / months), breakdown };
}

export function calculateEmergencyFund(context: "personal" | "business" = "personal") {
  const accounts = store.accounts.filter((a) => a.context === context && (a.type === "savings" || a.type === "checking" || a.type === "business_checking"));
  const liquid = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const { expenses } = calculateCashFlow(context, 3);
  const monthsCovered = expenses > 0 ? liquid / expenses : 0;
  const targetMonths = context === "business" ? 6 : 4;
  return {
    context,
    liquidAssets: Math.round(liquid),
    monthlyExpensesAvg: expenses,
    monthsCovered: Math.round(monthsCovered * 10) / 10,
    targetMonths,
    targetAmount: Math.round(expenses * targetMonths),
    gap: Math.max(0, Math.round(expenses * targetMonths - liquid)),
  };
}

export function calculateFinancialHealth(context: "personal" | "business" = "personal") {
  const savings = calculateSavingsRate(context, 3);
  const ef = calculateEmergencyFund(context);
  const creditCards = store.accounts.filter((a) => a.context === "personal" && a.type === "credit_card");
  const utilization = creditCards.length
    ? creditCards.reduce((s, a) => s + Math.abs(Math.min(0, a.balance)) / (a.creditLimit || 1), 0) / creditCards.length
    : 0;
  // simple composite score, 0-100, purely illustrative — NOT a credit score
  let score = 50;
  score += Math.min(25, savings.savingsRatePct);
  score += Math.min(15, ef.monthsCovered * 4);
  score -= Math.round(utilization * 30);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 75 ? "sólida" : score >= 50 ? "estable" : "requiere atención";
  return { context, score, label, savingsRatePct: savings.savingsRatePct, monthsEmergencyFund: ef.monthsCovered, creditUtilizationPct: Math.round(utilization * 1000) / 10 };
}

export function comparePeriods(context: "personal" | "business" = "personal", metric: "income" | "expenses" | "net" = "expenses", periodsBack = 1) {
  const current = calculateCashFlow(context, 1);
  const keysPrev = lastNMonthKeys(1, new Date(new Date("2026-09-10").setMonth(new Date("2026-09-10").getMonth() - periodsBack)));
  const prevTxs = txForContext(context).filter((t) => keysPrev.includes(monthKey(t.date)));
  const prevIncome = prevTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const prevExpenses = Math.abs(prevTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const prev = { income: Math.round(prevIncome), expenses: Math.round(prevExpenses), net: Math.round(prevIncome - prevExpenses) };
  const currentVal = current[metric];
  const prevVal = prev[metric];
  const pctChange = prevVal !== 0 ? Math.round(((currentVal - prevVal) / Math.abs(prevVal)) * 1000) / 10 : 0;
  return { context, metric, current: currentVal, previous: prevVal, pctChange };
}

export function calculateGoalProjection(goal: FinancialGoal, monthlyContribution?: number) {
  const monthsLeft = Math.max(
    1,
    Math.round((new Date(goal.targetDate).getTime() - new Date("2026-09-10").getTime()) / (1000 * 60 * 60 * 24 * 30))
  );
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const neededMonthly = Math.round(remaining / monthsLeft);
  const contribution = monthlyContribution ?? neededMonthly;
  const monthsToReachAtContribution = contribution > 0 ? Math.ceil(remaining / contribution) : Infinity;
  const progressPct = Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10;
  const onTrack = contribution >= neededMonthly * 0.95;
  return {
    goalId: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    progressPct,
    monthsLeft,
    neededMonthlyContribution: neededMonthly,
    simulatedMonthlyContribution: contribution,
    monthsToReachAtSimulatedContribution: monthsToReachAtContribution,
    onTrack,
  };
}

export function simulateSavingsScenario(goal: FinancialGoal, monthlyContribution: number) {
  const projection = calculateGoalProjection(goal, monthlyContribution);
  const series: { x: string; y: number }[] = [];
  let amount = goal.currentAmount;
  const start = new Date("2026-09-10");
  for (let i = 0; i <= projection.monthsLeft; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    series.push({ x: d.toISOString().slice(0, 7), y: Math.round(amount) });
    amount = Math.min(goal.targetAmount, amount + monthlyContribution);
  }
  return { ...projection, projectionSeries: series };
}
