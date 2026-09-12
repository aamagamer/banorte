import { NextResponse } from 'next/server'
import { runOrchestrator } from '@/lib/agent/orchestrator'
import { DEMO_CUSTOMERS } from '@/lib/demo-data/customers'

// Endpoint del agente orquestador. En este prototipo se ejecuta in-process
// (misma app Next.js) por velocidad de desarrollo; en produccion este endpoint
// seria el que llama a Claude con tool-calling real sobre el MCP server
// (ver docs/MCP.md, seccion "LIVE vs FALLBACK").
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const customerId = typeof body?.customerId === 'string' && body.customerId in DEMO_CUSTOMERS ? body.customerId : 'valentina'

  if (!message) {
    return NextResponse.json({ error: 'message es requerido' }, { status: 400 })
  }

  const result = await runOrchestrator(customerId, message)
  return NextResponse.json(result)
}
