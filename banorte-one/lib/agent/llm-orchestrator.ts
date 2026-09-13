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
//
// Robustez (requerido explicitamente: "que no falle"): esta version agrega
// (1) un parser de la respuesta final tolerante a variaciones de formato,
// (2) un limite de rondas mas alto mas un round final forzado sin tools para
// garantizar que siempre haya una respuesta de texto, (3) un reintento unico
// ante errores de red transitorios, y (4) una regla explicita en el system
// prompt para que el modelo use busqueda web en vez de quedarse sin
// responder cuando las tools locales no cubren lo que se pregunta.

import Anthropic from '@anthropic-ai/sdk'
import { callTool } from '@/lib/mcp/registry'
import { getCustomer, type Customer } from '@/lib/demo-data/customers'
import type { McpActivityEntry } from '@/lib/mcp/types'
import { validateUISchema, type UISchema } from '@/lib/components-registry/schema'
import type { OrchestratorResult } from './orchestrator'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5'
const MAX_TOOL_ROUNDS = 8
const MAX_WEB_SEARCHES = 3
const MAX_TOKENS = 2048

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
- spending_chart {context?, variant?: "bar"|"pie", accent?: "red"|"blue"|"green"|"purple"|"black", categoryColors?: string[]}: gasto por categoria (ordenadas de mayor a menor gasto, la posicion 0 es la de mas gasto). "bar" (default) son barras verticales; usa "pie" SOLO si el cliente pide explicitamente pastel/dona/circular. Colores (nombres EXACTOS de la lista "red"|"blue"|"green"|"purple"|"black", nunca un hex): no pongas "accent" ni "categoryColors" si el cliente no pidio cambiar el color — sin ninguno de los dos ya sale colorido por categoria por default. Usa "accent" cuando el cliente pide UN color para toda la grafica ("cambiale el color a azul"). Usa "categoryColors" (array por POSICION, no por nombre de categoria) SOLO cuando el cliente pide colores especificos y distintos para categorias distintas ("ponle rojo y azul" -> categoryColors: ["red","blue"]); dejalo mas corto que el numero de categorias si solo menciono algunas.
- comparison_chart {title?, months: [{month, nominal, real}], inflationAnnual?}: linea comparando ahorro nominal vs poder de compra real. Llena "months" con la salida real de calculate_purchasing_power_projection.
- alert {severity: "info"|"warning"|"critical", title, message}: alerta breve.
- recommendation {title, message}: una recomendacion derivada de los DATOS PROPIOS del cliente (no de busqueda web).
- web_insight {title?, items: [{title, summary, sourceTitle?, sourceUrl?}]}: usalo SOLO despues de usar la tool de busqueda web (ej. el cliente va a viajar, quiere comparar un producto, o pregunta algo que requiere informacion actual de internet). sourceUrl debe ser una URL real de los resultados de busqueda, nunca inventada.
- exchange_rate {from, to, rate}: usa siempre el resultado real de get_exchange_rate.
- card_controls {context?}: control de bloqueo/desbloqueo de tarjetas.
- business_summary {}: resumen del negocio del cliente (solo si el cliente tiene negocio).`

function buildSystemPrompt(customer: Customer, currentView?: UISchema | null): string {
  const accountsSummary = customer.accounts
    .map((a) => `${a.label} (${a.context}, ${a.type}): ${a.currency} ${a.balance.toLocaleString('es-MX')}`)
    .join('; ')
  const businessLine = customer.business
    ? `Tiene un negocio: ${customer.business.name} (ingreso mensual ~${customer.business.revenueMonthly}, gasto mensual ~${customer.business.expensesMonthly}).`
    : 'No tiene negocio registrado.'

  // Si el cliente ya tiene una vista en pantalla, se la mandamos para que
  // Maya pueda EDITARLA (cambiar color, tipo de grafica, tamaño, quitar un
  // componente, reordenar) en vez de regenerar todo desde cero cada vez que
  // el mensaje es un ajuste puntual sobre lo que ya ve. Solo mandamos
  // type/id/props (no priority/hidden/span): eso es lo unico que a Maya le
  // toca decidir; el resto lo administra el cliente (ver banking-shell.tsx).
  const currentViewSection =
    currentView && currentView.components.length > 0
      ? `\nVista actual en pantalla del cliente (ANTES de este mensaje):
${JSON.stringify(currentView.components.map((c) => ({ id: c.id, type: c.type, props: c.props })))}

Si el mensaje del cliente pide AJUSTAR algo que ya esta en esta lista (cambiar color/acento, cambiar tipo de grafica, agrandar o achicar, quitar, o cualquier modificacion sobre un componente EXISTENTE), tu respuesta final debe regresar TODOS los componentes de arriba tal cual, EXCEPTO el que el cliente pidio modificar (aplicale solo el cambio puntual que pidio, conservando su "id"). Si pide QUITAR un componente, simplemente no lo incluyas en tu respuesta. NUNCA inventes una vista nueva ni borres componentes que el cliente no menciono cuando lo que esta pidiendo es un ajuste.
Si en cambio el mensaje describe una situacion financiera nueva (no es un ajuste sobre lo que ya ve), ignora esta seccion y genera una vista nueva normalmente, como si no hubiera nada en pantalla.\n`
      : ''

  return `Eres Maya, el agente financiero de Banorte One. NO eres un chatbot generico de preguntas y respuestas: tu trabajo es decidir que datos reales necesitas (usando las tools disponibles) y luego describir la interfaz que el cliente debe ver, como un JSON declarativo. Nunca generas HTML ni JSX, y nunca inventas cifras: cada numero que pongas en un componente debe venir de una tool que llamaste en este turno (excepcion: cuando estas EDITANDO un componente existente segun la seccion "Vista actual" de abajo, conservas sus cifras tal cual, no necesitas volver a llamar la tool que las genero).

Cliente actual: ${customer.name}, perfil "${customer.profile}". ${businessLine}
Cuentas conocidas (ya las tienes, no necesitas volver a pedirlas si no vas a usar mas detalle): ${accountsSummary}.

${COMPONENT_CATALOG_PROMPT}
${currentViewSection}
Reglas:
1. Llama las tools que necesites (puedes llamar varias). No pidas ni asumas un customerId, ya sabes con quien hablas — las tools locales siempre usan al cliente actual. Si el mensaje es un ajuste puntual sobre la vista actual (ver seccion de arriba) y ya tienes los datos porque estaban en esa vista, no necesitas llamar ninguna tool.
2. BUSQUEDA WEB OBLIGATORIA cuando aplique: si para responder necesitas un dato que ninguna tool local cubre (precios actuales, viajes, comparar un producto o servicio, noticias, tipos de cambio de monedas que get_exchange_rate no soporte, o cualquier pregunta que dependa de informacion vigente de internet), DEBES usar la tool web_search en vez de quedarte sin responder, decir que no tienes esa informacion, o inventar un numero. Nunca dejes una pregunta sin resolver pudiendo buscarla.
3. Maximo 6 componentes en total.
4. No das asesoria financiera personalizada como si fuera garantizada: usa lenguaje de sugerencia ("podrias", "considera", "aproximadamente"), nunca certeza absoluta, y para "recommendation"/"web_insight" evita prometer resultados.
5. Cuando ya tengas todo lo que necesitas (deja de llamar tools), tu ULTIMA respuesta debe tener EXACTAMENTE este formato, sin nada despues del bloque de codigo:

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

// Tolerante a variaciones de formato: acepta un fence con o sin el tag
// "json", y si Claude no puso ningun fence (o la respuesta se corto antes de
// cerrarlo), intenta extraer el primer objeto JSON balanceado del texto como
// ultimo recurso. Solo lanza si de verdad no hay nada parseable — eso es lo
// unico que debe tumbar LIVE y activar el FALLBACK determinista.
function parseFinalText(text: string): ParsedFinalResponse {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    const reply = text.slice(0, fenced.index).trim() || 'Aqui tienes tu vista actualizada.'
    const rawSchema = JSON.parse(fenced[1].trim())
    return { reply, rawSchema }
  }

  const braceStart = text.indexOf('{')
  if (braceStart !== -1) {
    let depth = 0
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') {
        depth--
        if (depth === 0) {
          const candidate = text.slice(braceStart, i + 1)
          try {
            const rawSchema = JSON.parse(candidate)
            const reply = text.slice(0, braceStart).trim() || 'Aqui tienes tu vista actualizada.'
            return { reply, rawSchema }
          } catch {
            break
          }
        }
      }
    }
  }

  throw new Error('La respuesta final de Claude no incluyo un UI schema JSON valido')
}

async function executeTool(name: string, rawInput: unknown, customerId: string, activityLog: McpActivityEntry[]) {
  // El customerId real de la sesion siempre gana sobre cualquier cosa que el
  // modelo haya mandado (o no haya mandado) — MCP tool isolation.
  const input = { ...(rawInput as Record<string, unknown>), customerId }
  return callTool(name, input, activityLog)
}

function isTransientNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|Connection error/i.test(msg)
}

// Reintenta una sola vez ante errores de red transitorios (DNS, conexion
// reiniciada, etc). Cualquier otro error (auth, credito insuficiente, rate
// limit) se propaga de inmediato para que el LIVE→FALLBACK de mas arriba lo
// capture sin perder tiempo reintentando algo que no es transitorio.
async function createMessageWithRetry(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  try {
    return await anthropic.messages.create(params)
  } catch (error) {
    if (!isTransientNetworkError(error)) throw error
    console.warn('[llm-orchestrator] error de red transitorio, reintentando una vez:', (error as Error).message)
    await new Promise((resolve) => setTimeout(resolve, 800))
    return anthropic.messages.create(params)
  }
}

export async function runLiveOrchestrator(
  customerId: string,
  message: string,
  currentView?: UISchema | null,
): Promise<OrchestratorResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY no esta configurado')
  }

  const customer = getCustomer(customerId)
  const activityLog: McpActivityEntry[] = []
  const anthropic = getClient()
  const system = buildSystemPrompt(customer, currentView)

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }]
  let finalText = ''

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // En la ultima ronda permitida, forzamos una respuesta de texto (sin
    // tools) para garantizar que SIEMPRE salga algo parseable en vez de
    // agotar el limite de rondas sin respuesta final.
    const isLastRound = round === MAX_TOOL_ROUNDS - 1
    if (isLastRound) {
      messages.push({
        role: 'user',
        content:
          'Ya tienes suficiente informacion. No llames ninguna tool mas: responde AHORA mismo con tu respuesta final completa, en el formato exacto pedido (texto breve seguido del bloque ```json).',
      })
    }

    const response = await createMessageWithRetry(anthropic, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: CLAUDE_TOOLS,
      ...(isLastRound ? { tool_choice: { type: 'none' as const } } : {}),
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