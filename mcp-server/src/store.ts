// In-memory mutable state for the demo session: goals, preferences, and the
// current dashboard (so update_dashboard/remove_component/move_component can
// mutate "what's on screen" instead of only ever composing from scratch).
// A real deployment would key this by authenticated user/session id; for the
// hackathon demo there is a single implicit session.

import {
  ACCOUNTS,
  ECONOMIC_INDICATORS,
  FINANCIAL_PRODUCTS,
  GOALS,
  RECURRING_PAYMENTS,
  setPreference,
  TRANSACTIONS,
  USER_PREFERENCES,
  USER_PROFILE,
  recordTopic,
  type FinancialGoal,
  type UIGenerationResult,
} from "@hackmty/shared";

// clone so tool handlers never accidentally mutate the shared demo dataset in
// ways that corrupt other tools' reads
let goals: FinancialGoal[] = JSON.parse(JSON.stringify(GOALS));
let currentDashboard: UIGenerationResult | null = null;
let activeContext: "personal" | "business" = "personal";

export const store = {
  accounts: ACCOUNTS,
  transactions: TRANSACTIONS,
  recurringPayments: RECURRING_PAYMENTS,
  economicIndicators: ECONOMIC_INDICATORS,
  financialProducts: FINANCIAL_PRODUCTS,
  profile: USER_PROFILE,

  getPreferences() {
    return USER_PREFERENCES;
  },
  setPreferences(patch: Parameters<typeof setPreference>[0]) {
    return setPreference(patch);
  },
  noteTopic(topic: string) {
    recordTopic(topic);
  },

  getGoals(context?: "personal" | "business") {
    return context ? goals.filter((g) => g.context === context) : goals;
  },
  getGoal(id: string) {
    return goals.find((g) => g.id === id);
  },
  upsertGoal(goal: FinancialGoal) {
    const idx = goals.findIndex((g) => g.id === goal.id);
    if (idx >= 0) goals[idx] = goal;
    else goals.push(goal);
    return goal;
  },

  getActiveContext() {
    return activeContext;
  },
  setActiveContext(ctx: "personal" | "business") {
    activeContext = ctx;
    setPreference({ lastActiveContext: ctx });
    return activeContext;
  },

  getDashboard() {
    return currentDashboard;
  },
  setDashboard(ui: UIGenerationResult) {
    currentDashboard = ui;
    return currentDashboard;
  },
};
