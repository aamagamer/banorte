// Datos demo (ficticios) para el prototipo de Banorte One.
// NUNCA usar datos bancarios reales aqui. Este archivo es el "Demo Mode" adapter
// descrito en la arquitectura: en produccion se sustituye por llamadas a
// Banorte Sandbox / Supabase sin cambiar el contrato de las MCP tools.

export type ProfileId = 'student' | 'parent' | 'professional' | 'entrepreneur' | 'sme'

export interface Account {
  id: string
  type: 'checking' | 'savings' | 'credit' | 'business'
  label: string
  balance: number
  currency: 'MXN' | 'USD'
  context: 'personal' | 'business'
}

export interface Transaction {
  id: string
  date: string
  description: string
  category: string
  amount: number
  context: 'personal' | 'business'
}

export interface Goal {
  id: string
  label: string
  target: number
  current: number
  targetDate: string
  context: 'personal' | 'business'
}

export interface Customer {
  id: string
  name: string
  email: string
  profile: ProfileId
  accounts: Account[]
  transactions: Transaction[]
  goals: Goal[]
  cards: { id: string; last4: string; label: string; locked: boolean; context: 'personal' | 'business' }[]
  business?: { name: string; revenueMonthly: number; expensesMonthly: number }
}

export const DEMO_CUSTOMERS: Record<string, Customer> = {
  valentina: {
    id: 'valentina',
    name: 'Valentina Cruz',
    email: 'valentina.demo@banorteone.mx',
    profile: 'entrepreneur',
    business: { name: 'Cafe Nomada', revenueMonthly: 42000, expensesMonthly: 24800 },
    accounts: [
      { id: 'val-per-checking', type: 'checking', label: 'Cuenta personal', balance: 18420, currency: 'MXN', context: 'personal' },
      { id: 'val-per-savings', type: 'savings', label: 'Ahorro personal', balance: 4200, currency: 'MXN', context: 'personal' },
      { id: 'val-biz-checking', type: 'business', label: 'Cuenta Cafe Nomada', balance: 47800, currency: 'MXN', context: 'business' },
    ],
    transactions: [
      { id: 't1', date: '2026-09-08', description: 'Colegiatura Tec de Monterrey', category: 'educacion', amount: -3200, context: 'personal' },
      { id: 't2', date: '2026-09-09', description: 'Retiro de utilidades Cafe Nomada', category: 'retiro_negocio', amount: 5000, context: 'personal' },
      { id: 't3', date: '2026-09-09', description: 'Retiro de utilidades a socia', category: 'retiro_socios', amount: -5000, context: 'business' },
      { id: 't4', date: '2026-09-10', description: 'Compra de insumos - proveedor cafe', category: 'proveedores', amount: -8600, context: 'business' },
      { id: 't5', date: '2026-09-10', description: 'Restaurante', category: 'comida', amount: -420, context: 'personal' },
      { id: 't6', date: '2026-09-11', description: 'Ventas del dia', category: 'ventas', amount: 6200, context: 'business' },
    ],
    goals: [
      { id: 'g1', label: 'Fondo de emergencia personal', target: 15000, current: 4200, targetDate: '2027-03-01', context: 'personal' },
    ],
    cards: [
      { id: 'c1', last4: '4821', label: 'Tarjeta de debito personal', locked: false, context: 'personal' },
      { id: 'c2', last4: '2210', label: 'Tarjeta Cafe Nomada', locked: false, context: 'business' },
    ],
  },
  ana: {
    id: 'ana',
    name: 'Ana Torres',
    email: 'ana.demo@banorteone.mx',
    profile: 'student',
    accounts: [
      { id: 'ana-checking', type: 'checking', label: 'Cuenta personal', balance: 3120, currency: 'MXN', context: 'personal' },
      { id: 'ana-savings', type: 'savings', label: 'Ahorro para laptop', balance: 2450, currency: 'MXN', context: 'personal' },
    ],
    transactions: [
      { id: 't1', date: '2026-09-05', description: 'Deposito de beca', category: 'beca', amount: 4500, context: 'personal' },
      { id: 't2', date: '2026-09-06', description: 'Renta', category: 'vivienda', amount: -1800, context: 'personal' },
      { id: 't3', date: '2026-09-08', description: 'Uber', category: 'transporte', amount: -180, context: 'personal' },
      { id: 't4', date: '2026-09-09', description: 'Restaurante', category: 'comida', amount: -650, context: 'personal' },
    ],
    goals: [
      { id: 'g1', label: 'Comprar laptop', target: 18000, current: 2450, targetDate: '2027-01-15', context: 'personal' },
    ],
    cards: [{ id: 'c1', last4: '7734', label: 'Tarjeta de debito', locked: false, context: 'personal' }],
  },
  carlos: {
    id: 'carlos',
    name: 'Carlos Mendoza',
    email: 'carlos.demo@banorteone.mx',
    profile: 'parent',
    accounts: [
      { id: 'carlos-checking', type: 'checking', label: 'Cuenta personal', balance: 9800, currency: 'MXN', context: 'personal' },
      { id: 'carlos-savings', type: 'savings', label: 'Ahorro familiar', balance: 32000, currency: 'MXN', context: 'personal' },
    ],
    transactions: [
      { id: 't1', date: '2026-09-01', description: 'Nomina', category: 'nomina', amount: 28000, context: 'personal' },
      { id: 't2', date: '2026-09-03', description: 'Colegiatura hijos', category: 'educacion', amount: -6200, context: 'personal' },
      { id: 't3', date: '2026-09-05', description: 'Supermercado', category: 'comida', amount: -2400, context: 'personal' },
      { id: 't4', date: '2026-09-10', description: 'Seguro de gastos medicos', category: 'seguros', amount: -1100, context: 'personal' },
    ],
    goals: [
      { id: 'g1', label: 'Fondo de emergencia familiar', target: 60000, current: 32000, targetDate: '2027-06-01', context: 'personal' },
    ],
    cards: [{ id: 'c1', last4: '5510', label: 'Tarjeta de debito', locked: false, context: 'personal' }],
  },
  mariana: {
    id: 'mariana',
    name: 'Mariana Lopez',
    email: 'mariana.demo@banorteone.mx',
    profile: 'professional',
    accounts: [
      { id: 'mariana-checking', type: 'checking', label: 'Cuenta personal', balance: 24500, currency: 'MXN', context: 'personal' },
      { id: 'mariana-invest', type: 'savings', label: 'Inversion a plazo', balance: 85000, currency: 'MXN', context: 'personal' },
    ],
    transactions: [
      { id: 't1', date: '2026-09-01', description: 'Nomina', category: 'nomina', amount: 42000, context: 'personal' },
      { id: 't2', date: '2026-09-04', description: 'Aportacion a inversion', category: 'inversion', amount: -8000, context: 'personal' },
      { id: 't3', date: '2026-09-07', description: 'Restaurante', category: 'comida', amount: -980, context: 'personal' },
    ],
    goals: [
      { id: 'g1', label: 'Enganche departamento', target: 400000, current: 85000, targetDate: '2028-01-01', context: 'personal' },
    ],
    cards: [{ id: 'c1', last4: '3391', label: 'Tarjeta de credito', locked: false, context: 'personal' }],
  },
  roberto: {
    id: 'roberto',
    name: 'Roberto Salas',
    email: 'roberto.demo@banorteone.mx',
    profile: 'sme',
    business: { name: 'Ferreteria Salas', revenueMonthly: 310000, expensesMonthly: 268000 },
    accounts: [
      { id: 'roberto-checking', type: 'checking', label: 'Cuenta personal', balance: 15200, currency: 'MXN', context: 'personal' },
      { id: 'roberto-biz', type: 'business', label: 'Cuenta Ferreteria Salas', balance: 142000, currency: 'MXN', context: 'business' },
    ],
    transactions: [
      { id: 't1', date: '2026-09-01', description: 'Pago de nomina empleados', category: 'nomina', amount: -86000, context: 'business' },
      { id: 't2', date: '2026-09-03', description: 'Pago a proveedores', category: 'proveedores', amount: -120000, context: 'business' },
      { id: 't3', date: '2026-09-10', description: 'Ventas de la semana', category: 'ventas', amount: 210000, context: 'business' },
    ],
    goals: [
      { id: 'g1', label: 'Capital de trabajo', target: 200000, current: 142000, targetDate: '2027-01-01', context: 'business' },
    ],
    cards: [{ id: 'c1', last4: '9042', label: 'Tarjeta empresarial', locked: false, context: 'business' }],
  },
}

export function getCustomer(id: string): Customer {
  return DEMO_CUSTOMERS[id] ?? DEMO_CUSTOMERS.valentina
}

export function getCustomerByEmail(email: string): Customer {
  const match = Object.values(DEMO_CUSTOMERS).find((c) => c.email.toLowerCase() === email.toLowerCase())
  return match ?? DEMO_CUSTOMERS.valentina
}
