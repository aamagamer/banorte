// ============================================================================
// DEMO DATA ADAPTER
// ============================================================================
// Deterministic, seeded synthetic data for the hackathon demo. Nothing here
// is a real Banorte customer or real Banxico reading — every economic
// indicator is explicitly labeled "(simulado)" so the agent never presents
// fabricated numbers as verified fact. Swap this module for a
// ProductionAdapter (real Banorte Sandbox + real Banxico/INEGI APIs) without
// touching the MCP tool signatures — that's the whole point of the adapter
// boundary.

import {
  Account,
  EconomicIndicator,
  FinancialGoal,
  FinancialProduct,
  RecurringPayment,
  Transaction,
  TransactionCategory,
  UserPreferences,
  UserProfile,
} from "./types";

// ---- seeded PRNG so the demo is 100% reproducible across runs ----
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260910);
const jitter = (base: number, pct: number) => base * (1 + (rand() - 0.5) * 2 * pct);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date("2026-09-10T00:00:00Z");
function monthsAgo(n: number, day = 1) {
  const d = new Date(today);
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d;
}

export const USER_ID = "demo-user-1";

export const USER_PROFILE: UserProfile = {
  id: USER_ID,
  name: "Valentina Cruz",
  isStudent: true,
  isEntrepreneur: true,
  student: {
    institution: "Tecnológico de Monterrey",
    tuitionPerSemester: 68000,
    scholarshipAmount: 3500,
    scholarshipFrequency: "monthly",
    expectedGraduation: "2027-12-15",
  },
  entrepreneur: {
    businessName: "Café Nómada",
    businessType: "Cafetería / coworking",
    monthlyRevenueAvg: 45000,
    monthlyExpensesAvg: 31500,
    employeeCount: 2,
  },
  createdAt: "2024-08-01",
};

export let USER_PREFERENCES: UserPreferences = {
  userId: USER_ID,
  prefersCharts: true,
  prefersKpis: true,
  compactView: false,
  interestedInInvesting: false,
  frequentTopics: [],
  hasBusiness: true,
  lastActiveContext: "personal",
  updatedAt: iso(today),
};

export function setPreference(patch: Partial<UserPreferences>) {
  USER_PREFERENCES = { ...USER_PREFERENCES, ...patch, updatedAt: iso(today) };
  return USER_PREFERENCES;
}

export function recordTopic(topic: string) {
  if (!USER_PREFERENCES.frequentTopics.includes(topic)) {
    USER_PREFERENCES.frequentTopics = [...USER_PREFERENCES.frequentTopics, topic].slice(-10);
  }
}

// ---- Accounts ----
export const ACCOUNTS: Account[] = [
  {
    id: "acc-personal-checking",
    ownerId: USER_ID,
    context: "personal",
    type: "checking",
    name: "Cuenta Eje Banorte",
    institution: "Banorte",
    balance: 8420,
    currency: "MXN",
    lastUpdated: iso(today),
  },
  {
    id: "acc-personal-savings",
    ownerId: USER_ID,
    context: "personal",
    type: "savings",
    name: "Cuenta Inteligente Banorte",
    institution: "Banorte",
    balance: 10000,
    currency: "MXN",
    interestRate: 6.5,
    lastUpdated: iso(today),
  },
  {
    id: "acc-personal-credit",
    ownerId: USER_ID,
    context: "personal",
    type: "credit_card",
    name: "Tarjeta Oro Banorte",
    institution: "Banorte",
    balance: -3150,
    creditLimit: 15000,
    currency: "MXN",
    interestRate: 42.9,
    lastUpdated: iso(today),
  },
  {
    id: "acc-business-checking",
    ownerId: USER_ID,
    context: "business",
    type: "business_checking",
    name: "Cuenta PYME Banorte — Café Nómada",
    institution: "Banorte",
    balance: 47800,
    currency: "MXN",
    lastUpdated: iso(today),
  },
];

export const GOALS: FinancialGoal[] = [
  {
    id: "goal-car",
    ownerId: USER_ID,
    context: "personal",
    name: "Comprar un automóvil",
    targetAmount: 90000,
    currentAmount: 55800,
    targetDate: iso(monthsAgo(-10, 10)),
    createdAt: iso(monthsAgo(6, 1)),
    status: "behind",
  },
];

export const RECURRING_PAYMENTS: RecurringPayment[] = [
  {
    id: "rec-tuition",
    context: "personal",
    name: "Colegiatura (mensualidad)",
    amount: -11333,
    category: "tuition",
    frequency: "monthly",
    nextDueDate: iso(monthsAgo(-1, 5)),
  },
  {
    id: "rec-scholarship",
    context: "personal",
    name: "Beca académica",
    amount: 3500,
    category: "scholarship_income",
    frequency: "monthly",
    nextDueDate: iso(monthsAgo(-1, 1)),
  },
  {
    id: "rec-rent",
    context: "personal",
    name: "Renta departamento",
    amount: -4200,
    category: "housing",
    frequency: "monthly",
    nextDueDate: iso(monthsAgo(-1, 3)),
  },
  {
    id: "rec-payroll",
    context: "business",
    name: "Nómina (2 empleados)",
    amount: -14000,
    category: "business_payroll",
    frequency: "monthly",
    nextDueDate: iso(monthsAgo(-1, 15)),
  },
  {
    id: "rec-lease",
    context: "business",
    name: "Renta local Café Nómada",
    amount: -9500,
    category: "business_services",
    frequency: "monthly",
    nextDueDate: iso(monthsAgo(-1, 1)),
  },
];

// ---- Transactions: 6 months of history, personal + business ----
function genPersonalMonth(monthIdx: number): Transaction[] {
  const txs: Transaction[] = [];
  const push = (day: number, amount: number, category: TransactionCategory, description: string, merchant?: string, recurring = false) =>
    txs.push({
      id: `p-${monthIdx}-${txs.length}`,
      accountId: "acc-personal-checking",
      context: "personal",
      date: iso(monthsAgo(monthIdx, day)),
      amount: Math.round(amount),
      category,
      description,
      merchant,
      recurring,
    });

  push(1, jitter(3500, 0.02), "scholarship_income", "Depósito beca académica", "Tec de Monterrey", true);
  // colegiatura se paga por semestre, no cada mes — cae solo en el mes de
  // inscripción (este mes); el semestre anterior queda fuera de la ventana
  // de 6 meses de historial que generamos
  if (monthIdx === 0) {
    push(5, jitter(-11333, 0.0), "tuition", "Pago colegiatura (semestral)", "Tec de Monterrey", false);
  }
  // retiro del negocio hacia finanzas personales — el emprendimiento sostiene
  // parte del gasto personal, es el vínculo central de la narrativa dual-contexto
  push(16, jitter(5800, 0.1), "owner_draw", "Retiro de utilidades — Café Nómada", "Banorte", true);
  push(3, jitter(-4200, 0.0), "housing", "Renta departamento", "Inmobiliaria Saltillo", true);
  push(2, -jitter(650, 0.3), "utilities", "CFE + Internet", "CFE/Telmex", true);
  // groceries / food, several per month, trending slightly up over time (monthIdx smaller = more recent)
  const foodBase = 2200 + (5 - monthIdx) * 60; // spend crept up recently
  for (let i = 0; i < 8; i++) {
    push(2 + i * 3, -jitter(foodBase / 8, 0.4), "food", "Compra supermercado/restaurante", ["OXXO", "Soriana", "Starbucks", "Rappi"][i % 4]);
  }
  for (let i = 0; i < 5; i++) {
    push(4 + i * 5, -jitter(180, 0.3), "transport", "Uber / gasolina", "Uber");
  }
  push(20, -jitter(600, 0.5), "entertainment", "Cine / streaming / salidas", "Cinepolis");
  push(28, -jitter(900, 0.4), "shopping", "Ropa / artículos personales", "Amazon");
  // occasional extra transfer into savings when the month allows it
  if (monthIdx % 2 === 0) {
    push(15, jitter(1200, 0.2), "savings_transfer", "Transferencia a ahorro", "Banorte");
  }
  return txs;
}

function genBusinessMonth(monthIdx: number): Transaction[] {
  const txs: Transaction[] = [];
  const push = (day: number, amount: number, category: TransactionCategory, description: string) =>
    txs.push({
      id: `b-${monthIdx}-${txs.length}`,
      accountId: "acc-business-checking",
      context: "business",
      date: iso(monthsAgo(monthIdx, day)),
      amount: Math.round(amount),
      category,
      description,
    });

  // revenue grows slightly month over month toward present
  const revenueBase = 38000 + (5 - monthIdx) * 1600;
  for (let i = 0; i < 10; i++) {
    push(1 + i * 3, jitter(revenueBase / 10, 0.35), "business_revenue", "Ventas Café Nómada (POS)");
  }
  push(15, -jitter(14000, 0.05), "business_payroll", "Nómina quincenal");
  push(30, -jitter(14000, 0.05), "business_payroll", "Nómina quincenal");
  push(1, -jitter(9500, 0.0), "business_services", "Renta local");
  // expenses trending up recently (the "18% increase" narrative the agent can discover)
  const suppliesBase = 5200 * (monthIdx <= 1 ? 1.18 : 1);
  push(10, -jitter(suppliesBase, 0.15), "business_supplies", "Insumos (café, leche, empaques)");
  push(20, -jitter(1800, 0.3), "business_marketing", "Publicidad en redes sociales");
  push(25, -jitter(900, 0.2), "business_services", "Software / POS / contabilidad");
  push(16, -jitter(5800, 0.1), "owner_draw", "Retiro de utilidades a cuenta personal");
  return txs;
}

export function generateTransactions(months = 6): Transaction[] {
  const all: Transaction[] = [];
  for (let m = 0; m < months; m++) {
    all.push(...genPersonalMonth(m), ...genBusinessMonth(m));
  }
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const TRANSACTIONS = generateTransactions(6);

// ---- Economic indicators (demo/simulated — clearly labeled) ----
export const ECONOMIC_INDICATORS: EconomicIndicator[] = [
  {
    key: "inflation",
    label: "Inflación general anual (INPC)",
    value: 4.3,
    unit: "%",
    period: "anual",
    source: "INEGI (dato simulado para demo)",
    asOf: "2026-08-31",
  },
  {
    key: "interest_rate",
    label: "Tasa de referencia Banxico",
    value: 9.25,
    unit: "%",
    period: "actual",
    source: "Banxico (dato simulado para demo)",
    asOf: "2026-08-31",
  },
  {
    key: "cetes_28",
    label: "CETES 28 días",
    value: 8.9,
    unit: "%",
    period: "actual",
    source: "Banxico (dato simulado para demo)",
    asOf: "2026-08-31",
  },
  {
    key: "exchange_rate_usd_mxn",
    label: "Tipo de cambio USD/MXN",
    value: 18.45,
    unit: "MXN",
    period: "spot",
    source: "Banxico (dato simulado para demo)",
    asOf: "2026-09-09",
  },
];

// ---- Financial products (Banorte-style catalog) ----
export const FINANCIAL_PRODUCTS: FinancialProduct[] = [
  {
    id: "prod-cuenta-inteligente",
    category: "savings",
    name: "Cuenta Inteligente",
    institution: "Banorte",
    rate: 6.5,
    rateLabel: "GAT Nominal",
    minAmount: 0,
    description: "Cuenta de ahorro con rendimiento diario, sin comisión por manejo de cuenta.",
  },
  {
    id: "prod-pagare-banorte",
    category: "investment",
    name: "Pagaré Banorte",
    institution: "Banorte",
    rate: 9.8,
    rateLabel: "GAT Nominal",
    minAmount: 5000,
    description: "Inversión a plazo fijo (28-360 días), rendimiento garantizado.",
  },
  {
    id: "prod-fondo-pyme",
    category: "credit",
    name: "Crédito PYME Banorte",
    institution: "Banorte",
    rate: 18.5,
    rateLabel: "CAT",
    minAmount: 20000,
    description: "Crédito para capital de trabajo de negocios con al menos 12 meses de operación.",
  },
];

export function getSnapshot(context: "personal" | "business") {
  const accounts = ACCOUNTS.filter((a) => a.context === context);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  return { accounts, totalBalance };
}
