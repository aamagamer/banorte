// ============================================================================
// DATA MODEL — Adaptive Financial Interface (Banorte HackMTY)
// ============================================================================
// This is the contract shared between the MCP server (data + tools) and the
// web app (agent orchestrator + UI composer). Nothing here is UI-specific —
// see ui-schema.ts for the declarative UI protocol.

export type FinancialContextType = "personal" | "business";

export type AccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "business_checking"
  | "investment"
  | "loan";

export interface Account {
  id: string;
  ownerId: string;
  context: FinancialContextType;
  type: AccountType;
  name: string;
  institution: string; // "Banorte"
  balance: number;
  currency: "MXN";
  creditLimit?: number; // for credit_card
  interestRate?: number; // for loan/investment/credit
  lastUpdated: string; // ISO date
}

export type TransactionCategory =
  | "food"
  | "transport"
  | "tuition"
  | "scholarship_income"
  | "housing"
  | "entertainment"
  | "health"
  | "utilities"
  | "shopping"
  | "business_revenue"
  | "business_supplies"
  | "business_payroll"
  | "business_marketing"
  | "business_services"
  | "owner_draw"
  | "savings_transfer"
  | "investment"
  | "other";

export interface Transaction {
  id: string;
  accountId: string;
  context: FinancialContextType;
  date: string; // ISO date
  amount: number; // negative = expense, positive = income
  category: TransactionCategory;
  description: string;
  merchant?: string;
  recurring?: boolean;
}

export interface RecurringPayment {
  id: string;
  context: FinancialContextType;
  name: string;
  amount: number;
  category: TransactionCategory;
  frequency: "monthly" | "weekly" | "biweekly" | "annual";
  nextDueDate: string;
}

export type GoalStatus = "on_track" | "behind" | "ahead" | "completed";

export interface FinancialGoal {
  id: string;
  ownerId: string;
  context: FinancialContextType;
  name: string; // "Comprar automóvil"
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO date
  createdAt: string;
  status: GoalStatus;
  monthlyContributionNeeded?: number;
}

export interface UserPreferences {
  userId: string;
  prefersCharts: boolean;
  prefersKpis: boolean;
  compactView: boolean;
  interestedInInvesting: boolean;
  frequentTopics: string[]; // e.g. ["savings", "cash_flow"]
  hasBusiness: boolean;
  lastActiveContext: FinancialContextType;
  updatedAt: string;
}

export interface StudentContext {
  institution: string;
  tuitionPerSemester: number;
  scholarshipAmount: number;
  scholarshipFrequency: "monthly" | "semester";
  expectedGraduation: string;
}

export interface EntrepreneurContext {
  businessName: string;
  businessType: string;
  monthlyRevenueAvg: number;
  monthlyExpensesAvg: number;
  employeeCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  isStudent: boolean;
  isEntrepreneur: boolean;
  student?: StudentContext;
  entrepreneur?: EntrepreneurContext;
  createdAt: string;
}

// Economic indicators (external data adapter)
export interface EconomicIndicator {
  key: "inflation" | "interest_rate" | "exchange_rate_usd_mxn" | "cetes_28";
  label: string;
  value: number; // percentage or absolute
  unit: "%" | "MXN";
  period: string; // e.g. "2026-08" or "anual"
  source: string; // "Banxico" | "INEGI"
  asOf: string; // ISO date
}

export interface FinancialProduct {
  id: string;
  category: "savings" | "credit" | "investment";
  name: string;
  institution: string;
  rate: number; // annual rate, % (GAT/CAT dependiendo del tipo)
  rateLabel: string; // "GAT Nominal" | "CAT"
  minAmount?: number;
  description: string;
}

// Aggregate financial context returned to the agent
export interface FinancialContextSnapshot {
  context: FinancialContextType;
  accounts: Account[];
  totalBalance: number;
  monthlyIncomeAvg: number;
  monthlyExpensesAvg: number;
  cashFlow: number;
  goals: FinancialGoal[];
}
