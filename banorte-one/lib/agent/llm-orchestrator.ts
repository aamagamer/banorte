// LIVE Orchestrator — tool-calling real con Claude (ver docs/MCP.md, seccion
// "LIVE vs FALLBACK"). Este archivo es lo unico que cambia entre demo
// determinista y demo con IA real: expone el mismo catalogo de MCP tools
// (lib/mcp/tools.ts) a Claude via la Messages API, deja que el MODELO decida
// que tools llamar y en que orden, y al final exige que Claude regrese una
// respuesta conversacional + un UI Schema JSON validado contra el catalogo
// cerrado de componentes (lib/components-registry/schema.ts). El LLM nunca
// genera HTML/JSX: solo eligeg "type" de una lista cerrada, igual que en
// FALLBACK.
//
// Seguridad (brief seccion 16, "MCP tool isolation"): el customerId real de
// la sesion NUNCA se expone como parametro que el modelo pueda decidir — se
// inyecta server-side en cada llamada a tool, y cualquier customerId que el
// modelo intente mandar se ignora.

import Anthropic from '@anthropic-ai/sdk'
import { callTool } from '@/lib/mcp/registry'
import { getCustomer, type Customer } from '@/lib/demo-data/customers'
import type { McpActivityEntry } from '@/lib/mcp/types'
import { validateUISchema, type UISchema } from '@/lib/components-registry/schema'
import type { OrchestratorResult } from './orchestrator'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5'
const MAX_TOOL_ROUNDS = 6
const MAX_WEB_SEARCHES = 3

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

// Tools locales (MCP) que el modelo puede invocar. `customerId` se omite a
// proposito de cada input_schema: el wrapper lo inyecta siempre con el valor
// real de la sesion (ver executeTool).
const CLAUDE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_customer_profile',
    description: 'Perfil declarado del cliente actual (estudiante, profesionista, emprendedor, etc) y sus intereses.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_customer_accounts',
    description: 'Cuentas (personales y de negocio) del cliente actual con su saldo real.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_customer_transactions',
    description: 'Movimientos recientes del cliente actual, opcionalmente filtrados por contexto.',
    input_schema: {
      type: 'object',
      properties: {
        context: { type: 'string', enum: ['personal', 'business'], description: 'Filtra por contexto personal o de negocio.' },
        limit: { type: 'number', description: 'Maximo de movimientos a regresar.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_customer_goals',
    description: 'Metas financieras activas del cliente actual (ahorro, fondo de emergencia, etc).',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'calculate_cash_flow',
    description: 'Ingresos, gastos y flujo neto del cliente actual para un contexto dado.',
    input_schema: {
      type: 'object',
      properties: { context: { type: 'string', enum: ['personal', 'business'] } },
      additionalProperties: false,
    },
  },
  {
    name: 'calculate_spending_by_category',
    description: 'Gasto del cliente actual agrupado por categoria (para graficas de gasto).',
    input_schema: {
      type: 'object',
      properties: { context: { type: 'string', enum: ['personal', 'business'] } },
      additionalProperties: false,
    },
  },
  {
    name: 'calculate_goal_projection',
    description: 'Proyecta cuantos meses faltan para alcanzar una meta del cliente actual.',
    input_schema: {
      type: 'object',
      properties: {
        goalId: { type: 'string', description: 'Id de la meta (obtenido de get_customer_goals).' },
        monthlyContribution: { type: 'number' },
      },
      required: ['goalId'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_exchange_rate',
    description: 'Tipo de cambio real entre dos monedas (Banxico SIE / Frankfurter). Usa esto, nunca inventes un tipo de cambio.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Codigo de moneda origen, ej. USD' },
        to: { type: 'string', description: 'Codigo de moneda destino, ej. MXN' },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_inflation',
    description: 'Inflacion anual real de Mexico (Banxico SIE, INPC). Usa esto, nunca inventes una cifra de inflacion.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'calculate_purchasing_power_projection',
    description: 'Proyecta el ahorro nominal del cliente actual contra su poder adquisitivo real (descontando inflacion real).',
    input_schema: {
      type: 'object',
      properties: { months: { type: 'number', description: 'Meses a proyectar, default 6.' } },
      additionalProperties: false,
    },
  },
  // Tool nativa de Anthropic: la busqueda se ejecuta server-side dentro de la
  // Messages API (no hay handler local que implementar aqui). Ver
  // docs/MCP.md y https://platform.claude.com/docs — "Web search tool".
  { type: 'web_search_20250305', name: 'web_search', max_uses: MAX_WEB_SEARCHES } as unknown as Anthropic.Tool,
]

const COMPONENT_CATALOG_PROMPT = `Catalogo cerrado de componentes de UI (usa "type" EXACTAMENTE como aqui; cualquier otro valor sera descartado por el validador y no se mostrara):
- situation_banner {label, explanation}: banner que explica la situacion detectada. Casi siempre debe ir primero.
- kpi {title, value, format: "currency"|"percent"|"number", trend?}: una cifra clave.
- account_card {context?: "personal"|"business"}: tarjetas de cuentas del cliente.
- transaction_list {context?, limit?}: tabla de movimientos recientes.
- goal_progress {goalId}: barra de progreso de una meta financiera EXISTENTE del cliente (usa el id real de get_customer_goals).
- spending_chart {context?}: barras de gasto por categoria.
- comparison_chart {title?, months: [{month, nominal, real}], inflationAnnual?}: linea comparando ahorro nominal vs poder de compra real. Llena "months" con la salida real de calculate_purchasing_power_projection.
- alert {severity: "info"|"warning"|"critical", title, message}: alerta breve.
- recommendation {title, message}: una recomendacion derivada de los DATOS PROPIOS del cliente (no de busqueda web).
- web_insight {title?, items: [{title, summary, sourceTitle?, sourceUrl?}]}: usalo SOLO despues de usar la tool de busqueda web (ej. el cliente va a viajar, quiere comparar un producto, o pregunta algo que requiere informacion actual de internet). sourceUrl debe ser una URL real de los resultados de busqueda, nunca inventada.
- exchange_rate {from, to, rate}: usa siempre el resultado real de get_exchange_rate.
- card_controls {context?}: control de bloqueo/desbloqueo de tarjetas.
- business_summary {}: resumen del negocio del cliente (solo si el cliente tiene negocio).`

function buildSystemPrompt(customer: Customer): string {
  const accountsSummary = customer.accounts
    .map((a) => `${a.label} (${a.context}, ${a.type}): ${a.currency} ${a.balance.toLocaleString('es-MX')}`)
    .join('; ')
  const businessLine = customer.business
    ? `Tiene un negocio: ${customer.business.name} (ingreso mensual ~${customer.business.revenueMonthly}, gasto mensual ~${customer.business.expensesMonthly}).`
    : 'No tiene negocio registrado.'

  return `Eres Maya, el agente financiero de Banorte One. NO eres un chatbot generico de preguntas y respuestas: tu trabajo es decidir que datos reales necesitas (usando las tools disponibles) y luego describir la interfaz que el cliente debe ver, como un JSON declarativo. Nunca generas HTML ni JSX, y nunca inventas cifras: cada numero que pongas en un componente debe venir de una tool que llamaste en este turno.

Cliente actual: ${customer.name}, perfil "${customer.profile}". ${businessLine}
Cuentas conocidas (ya las tienes, no necesitas volver a pedirlas si no vas a usar mas detalle): ${accountsSummary}.

${COMPONENT_CATALOG_PROMPT}

Reglas:
1. Llama las tools que necesites (puedes llamar varias, y tambien puedes usar la busqueda web si la situacion lo amerita: planeacion de viajes, comparar un producto o gasto especifico, o cualquier pregunta que dependa de informacion actual). No pidas ni asumas un customerId, ya sabes con quien hablas — las tools locales siempre usan al cliente actual.
2. Maximo 6 componentes en total.
3. No das asesoria financiera personalizada como si fuera garantizada: usa lenguaje de sugerencia ("podrias", "considera", "aproximadamente"), nunca certeza absoluta, y para "recommendation"/"web_insight" evita prometer resultados.
4. Cuando ya tengas todo lo que necesitas (deja de llamar tools), tu ULTIMA respuesta debe tener EXACTAMENTE este formato, sin nada despues del bloque de codigo:

Primero 1 a 3 oraciones en español, tono cercano y claro, explicando que le preparaste al cliente (esto se muestra tal cual en el chat).

Luego, en la misma respuesta, un bloque de codigo con este shape exacto (JSON valido, sin comentarios):

\`\`\`json
{"title": "string", "explanation": "string", "components": [{"type": "string_del_catalogo", "id": "string_unico", "priority": 1, "props": {}}], "nextBestActions": [{"label": "string", "action": "string"}]}
\`\`\`

"nextBestActions" debe tener 2 o 3 sugerencias de siguiente pregunta que el cliente podria hacer, en primera persona (ej. "Quiero ver mi negocio").`
}

interface ParsedFinalResponse {
  reply: string
  rawSchema: unknown
}

function parseFinalText(text: string): ParsedFinalResponse {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) {
    throw new Error('La respuesta final de Claude no incluyo el bloque ```json con el UI schema')
  }
  const reply = text.slice(0, match.index).trim() || 'Aqui tienes tu vista actualizada.'
  const rawSchema = JSON.parse(match[1])
  return { reply, rawSchema }
}

async function executeTool(name: string, rawInput: unknown, customerId: string, activityLog: McpActivityEntry[]) {
  // El customerId real de la sesion siempre gana sobre cualquier cosa que el
  // modelo haya mandado (o no haya mandado) — MCP tool isolation.
  const input = { ...(rawInput as Record<string, unknown>), customerId }
  return callTool(name, input, activityLog)
}

export async function runLiveOrchestrator(customerId: string, message: string): Promise<OrchestratorResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no esta configurado')
  }

  const customer = getCustomer(customerId)
  const activityLog: McpActivityEntry[] = []
  const anthropic = getClient()

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }]
  let finalText = ''

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(customer),
      tools: CLAUDE_TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    const clientToolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )

    if (clientToolUses.length === 0) {
      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
      break
    }

    const toolResults = await Promise.all(
      clientToolUses.map(async (block) => {
        try {
          const output = await executeTool(block.name, block.input, customerId, activityLog)
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(output),
          }
        } catch (error) {
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: `Error ejecutando ${block.name}: ${(error as Error).message}`,
            is_error: true,
          }
        }
      }),
    )

    messages.push({ role: 'user', content: toolResults })
  }

  if (!finalText) {
    throw new Error('Claude no regreso una respuesta final dentro del limite de rondas de tools')
  }

  const { reply, rawSchema } = parseFinalText(finalText)
  const uiSchema: UISchema = validateUISchema(rawSchema as UISchema)

  return { reply, uiSchema, mcpActivity: activityLog }
}
