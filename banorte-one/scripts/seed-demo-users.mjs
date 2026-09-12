// Crea (o actualiza) los 5 usuarios demo de Banorte One en Supabase Auth y
// siembra sus tablas (profiles, accounts, cards, transactions, goals).
//
// Requiere en .env.local (NUNCA se sube a git, ver .gitignore):
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings > API > service_role. Es secreta.)
//
// Uso:
//   node scripts/seed-demo-users.mjs
//
// Password demo compartida (cambiala con DEMO_PASSWORD=otra node scripts/seed-demo-users.mjs):
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'BanorteOne2026!'

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'

function loadEnvLocal() {
  const path = new URL('../.env.local', import.meta.url)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim()
  }
}
loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const DEMO_USERS = [
  {
    email: 'valentina.demo@banorteone.mx',
    full_name: 'Valentina Cruz',
    profile_type: 'entrepreneur',
    business_name: 'Cafe Nomada',
    accounts: [
      { key: 'per_checking', type: 'checking', label: 'Cuenta personal', balance: 18420, currency: 'MXN', context: 'personal' },
      { key: 'per_savings', type: 'savings', label: 'Ahorro personal', balance: 4200, currency: 'MXN', context: 'personal' },
      { key: 'biz_checking', type: 'business', label: 'Cuenta Cafe Nomada', balance: 47800, currency: 'MXN', context: 'business' },
    ],
    cards: [
      { account: 'per_checking', last4: '4821', label: 'Tarjeta de debito personal', context: 'personal' },
      { account: 'biz_checking', last4: '2210', label: 'Tarjeta Cafe Nomada', context: 'business' },
    ],
    transactions: [
      { account: 'per_checking', occurred_on: '2026-09-08', description: 'Colegiatura Tec de Monterrey', category: 'educacion', amount: -3200, context: 'personal' },
      { account: 'biz_checking', occurred_on: '2026-09-10', description: 'Compra de insumos - proveedor cafe', category: 'proveedores', amount: -8600, context: 'business' },
      { account: 'biz_checking', occurred_on: '2026-09-11', description: 'Ventas del dia', category: 'ventas', amount: 6200, context: 'business' },
    ],
    goals: [{ label: 'Fondo de emergencia personal', target: 15000, current_amount: 4200, target_date: '2027-03-01', context: 'personal' }],
  },
  {
    email: 'ana.demo@banorteone.mx',
    full_name: 'Ana Torres',
    profile_type: 'student',
    accounts: [
      { key: 'checking', type: 'checking', label: 'Cuenta personal', balance: 3120, currency: 'MXN', context: 'personal' },
      { key: 'savings', type: 'savings', label: 'Ahorro para laptop', balance: 2450, currency: 'MXN', context: 'personal' },
    ],
    cards: [{ account: 'checking', last4: '7734', label: 'Tarjeta de debito', context: 'personal' }],
    transactions: [
      { account: 'checking', occurred_on: '2026-09-05', description: 'Deposito de beca', category: 'beca', amount: 4500, context: 'personal' },
      { account: 'checking', occurred_on: '2026-09-09', description: 'Restaurante', category: 'comida', amount: -650, context: 'personal' },
    ],
    goals: [{ label: 'Comprar laptop', target: 18000, current_amount: 2450, target_date: '2027-01-15', context: 'personal' }],
  },
  {
    email: 'carlos.demo@banorteone.mx',
    full_name: 'Carlos Mendoza',
    profile_type: 'parent',
    accounts: [
      { key: 'checking', type: 'checking', label: 'Cuenta personal', balance: 9800, currency: 'MXN', context: 'personal' },
      { key: 'savings', type: 'savings', label: 'Ahorro familiar', balance: 32000, currency: 'MXN', context: 'personal' },
    ],
    cards: [{ account: 'checking', last4: '5510', label: 'Tarjeta de debito', context: 'personal' }],
    transactions: [
      { account: 'checking', occurred_on: '2026-09-01', description: 'Nomina', category: 'nomina', amount: 28000, context: 'personal' },
      { account: 'checking', occurred_on: '2026-09-03', description: 'Colegiatura hijos', category: 'educacion', amount: -6200, context: 'personal' },
    ],
    goals: [{ label: 'Fondo de emergencia familiar', target: 60000, current_amount: 32000, target_date: '2027-06-01', context: 'personal' }],
  },
  {
    email: 'mariana.demo@banorteone.mx',
    full_name: 'Mariana Lopez',
    profile_type: 'professional',
    accounts: [
      { key: 'checking', type: 'checking', label: 'Cuenta personal', balance: 24500, currency: 'MXN', context: 'personal' },
      { key: 'invest', type: 'savings', label: 'Inversion a plazo', balance: 85000, currency: 'MXN', context: 'personal' },
    ],
    cards: [{ account: 'checking', last4: '3391', label: 'Tarjeta de credito', context: 'personal' }],
    transactions: [
      { account: 'checking', occurred_on: '2026-09-01', description: 'Nomina', category: 'nomina', amount: 42000, context: 'personal' },
      { account: 'invest', occurred_on: '2026-09-04', description: 'Aportacion a inversion', category: 'inversion', amount: -8000, context: 'personal' },
    ],
    goals: [{ label: 'Enganche departamento', target: 400000, current_amount: 85000, target_date: '2028-01-01', context: 'personal' }],
  },
  {
    email: 'roberto.demo@banorteone.mx',
    full_name: 'Roberto Salas',
    profile_type: 'sme',
    business_name: 'Ferreteria Salas',
    accounts: [
      { key: 'checking', type: 'checking', label: 'Cuenta personal', balance: 15200, currency: 'MXN', context: 'personal' },
      { key: 'biz', type: 'business', label: 'Cuenta Ferreteria Salas', balance: 142000, currency: 'MXN', context: 'business' },
    ],
    cards: [{ account: 'biz', last4: '9042', label: 'Tarjeta empresarial', context: 'business' }],
    transactions: [
      { account: 'biz', occurred_on: '2026-09-03', description: 'Pago a proveedores', category: 'proveedores', amount: -120000, context: 'business' },
      { account: 'biz', occurred_on: '2026-09-10', description: 'Ventas de la semana', category: 'ventas', amount: 210000, context: 'business' },
    ],
    goals: [{ label: 'Capital de trabajo', target: 200000, current_amount: 142000, target_date: '2027-01-01', context: 'business' }],
  },
]

async function findOrCreateUser(email) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (!createError) return created.user

  // Ya existe: lo buscamos (paginado simple, suficiente para <1000 usuarios demo)
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!existing) throw createError
  return existing
}

async function main() {
  const summary = []
  for (const demoUser of DEMO_USERS) {
    const user = await findOrCreateUser(demoUser.email)
    const userId = user.id

    await supabase.from('profiles').upsert({
      id: userId,
      full_name: demoUser.full_name,
      profile_type: demoUser.profile_type,
      business_name: demoUser.business_name ?? null,
    })

    await supabase.from('accounts').delete().eq('user_id', userId)
    const accountIdByKey = {}
    for (const account of demoUser.accounts) {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ user_id: userId, type: account.type, label: account.label, balance: account.balance, currency: account.currency, context: account.context })
        .select('id')
        .single()
      if (error) throw error
      accountIdByKey[account.key] = data.id
    }

    await supabase.from('cards').delete().eq('user_id', userId)
    for (const card of demoUser.cards ?? []) {
      await supabase.from('cards').insert({
        user_id: userId,
        account_id: accountIdByKey[card.account] ?? null,
        last4: card.last4,
        label: card.label,
        context: card.context,
      })
    }

    await supabase.from('transactions').delete().eq('user_id', userId)
    for (const tx of demoUser.transactions ?? []) {
      await supabase.from('transactions').insert({
        user_id: userId,
        account_id: accountIdByKey[tx.account] ?? null,
        occurred_on: tx.occurred_on,
        description: tx.description,
        category: tx.category,
        amount: tx.amount,
        context: tx.context,
      })
    }

    await supabase.from('goals').delete().eq('user_id', userId)
    for (const goal of demoUser.goals ?? []) {
      await supabase.from('goals').insert({
        user_id: userId,
        label: goal.label,
        target: goal.target,
        current_amount: goal.current_amount,
        target_date: goal.target_date,
        context: goal.context,
      })
    }

    summary.push({ email: demoUser.email, password: DEMO_PASSWORD, profile: demoUser.profile_type })
    console.log(`OK  ${demoUser.email}`)
  }

  console.log('\nUsuarios demo listos:')
  console.table(summary)
}

main().catch((error) => {
  console.error('Fallo el seed:', error)
  process.exit(1)
})
