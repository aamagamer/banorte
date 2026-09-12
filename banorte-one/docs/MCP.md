# MCP — Model Context Protocol en Banorte One

## Por que MCP es central y no decorativo

El agente orquestador **nunca** toca datos del cliente, calcula metricas
financieras o decide que tipos de componente existen por su cuenta: todo pasa
por herramientas MCP explicitas y tipadas. Esto es lo que hace posible que:

1. El catalogo de componentes permitidos sea auditable (`get_allowed_components`).
2. Cada respuesta sea trazable (panel "MCP Activity" en la UI muestra cada
   tool llamada, en orden, con su permiso).
3. Cambiar la fuente de datos (Demo Mode -> Supabase -> Banorte Sandbox real)
   no requiera tocar el agente ni la UI, solo `lib/mcp/tools.ts`.

## Estado actual de la implementacion

En este prototipo las tools viven in-process (`lib/mcp/tools.ts` +
`lib/mcp/registry.ts`) por velocidad de desarrollo del hackathon: mismo
runtime de Next.js, misma forma `{name, description, permission, run}` que
tendrian como servidor MCP real. **Siguiente paso natural**: envolver
`TOOLS` con `@modelcontextprotocol/sdk` (`Server` + `setRequestHandler` para
`tools/list` y `tools/call`) y correrlo como proceso MCP separado sobre stdio,
tal como se hizo en una iteracion previa del proyecto (ver
`claude/arquitectura-y-estado-mvp.md` en el Project) — el catalogo y los
permisos no cambian, solo el transporte.

## Catalogo de tools implementado

| Tool | Categoria | Permiso | Descripcion |
|---|---|---|---|
| `get_customer_profile` | Financial Data | read | Perfil declarado del cliente + intereses |
| `get_customer_accounts` | Financial Data | read | Cuentas personales y de negocio |
| `get_customer_transactions` | Financial Data | read | Movimientos, filtrables por contexto |
| `get_customer_goals` | Financial Data | read | Metas financieras activas |
| `calculate_cash_flow` | Financial Analysis | read | Ingreso, gasto y flujo neto de un contexto |
| `calculate_spending_by_category` | Financial Analysis | read | Gasto agrupado por categoria |
| `calculate_goal_projection` | Financial Analysis | read | Meses restantes y ahorro mensual requerido |
| `get_exchange_rate` | Economic Data | read | Tipo de cambio (Demo Mode; produccion: Banxico) |
| `get_inflation` | Economic Data | read | Inflacion anual (Demo Mode; produccion: INEGI) |
| `calculate_purchasing_power_projection` | Financial Analysis | read | Proyecta ahorro nominal vs poder adquisitivo real (mes a mes, descontando inflacion) |
| `detect_situation` | Situation Engine | read | Situacion primaria + secundarias a partir del mensaje y los datos |
| `get_next_best_actions` | Next Best Action | read | Acciones recomendadas para la situacion detectada |
| `get_allowed_components` | UI | read | Catalogo de tipos de componente que la UI sabe renderizar |

Documentado pero **no implementado** en el MVP (fuera de alcance de tiempo,
ver `docs/SECURITY.md`): `create_financial_goal`, `update_financial_goal`,
`get_savings_products` / `get_credit_products` / `compare_products`,
`transfer_money`, `contract_product`. Estas ultimas dos requieren, por diseno,
una capa explicita de autorizacion humana antes de existir siquiera como tool
real (no solo como permiso).

## LIVE vs FALLBACK

- **FALLBACK (activo por default):** `runOrchestrator` decide que tools llamar
  con una funcion determinista (`buildComponentsForSituation`), sin llamar a
  ningun LLM. Permite demostrar todo el flujo MCP -> UI sin gastar creditos de
  API y sin depender de latencia de red durante la demo.
- **LIVE (con `ANTHROPIC_API_KEY`):** el mismo catalogo de tools (`TOOLS` en
  `lib/mcp/tools.ts`) se expone a Claude via tool-calling
  (`@anthropic-ai/sdk`), y es el modelo quien decide la secuencia de llamadas.
  Es el modo recomendado para la demo final ante jurado (el jurado deberia
  ver tool-calling real, no solo el motor de reglas) — pendiente de cablear
  el loop de tool-calling en `lib/agent/orchestrator.ts` (hoy solo implementa
  FALLBACK; el catalogo de tools ya esta listo para reutilizarse en LIVE).

## Ejemplo de llamada

```ts
import { callTool } from '@/lib/mcp/registry'

const activityLog: McpActivityEntry[] = []
const { primary } = await callTool('detect_situation', {
  customerId: 'valentina',
  message: 'voy a viajar a Nueva York el proximo mes',
}, activityLog)
// primary.id === 'traveling'
```
