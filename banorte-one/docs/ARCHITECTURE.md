# Arquitectura — Banorte One

## Principio rector

La IA no vive dentro de la interfaz: la IA decide como debe ser la interfaz.
El LLM/agente nunca genera JSX ni HTML arbitrario. Genera un **UI Schema**
declarativo (JSON), que se valida contra un catalogo cerrado de componentes
antes de renderizarse.

## Flujo end-to-end

```
Usuario escribe un mensaje
        |
        v
POST /api/agent  { message, customerId }
        |
        v
Orchestrator Agent (lib/agent/orchestrator.ts)
   |-- get_customer_profile        (MCP tool, read)
   |-- detect_situation            (MCP tool, read)  -> situacion primaria + secundarias
   |-- get_next_best_actions       (MCP tool, read)
   |-- get_allowed_components      (MCP tool, read)
   |-- calculate_cash_flow / calculate_spending_by_category /
   |   calculate_goal_projection / get_exchange_rate / get_inflation /
   |   calculate_purchasing_power_projection
   |   (MCP tools, read — se llaman segun la situacion detectada)
        |
        v
Composicion de componentes (buildComponentsForSituation)
        |
        v
UI Schema candidato -> validateUISchema() (lib/components-registry/schema.ts)
   descarta cualquier "type" que no este en ALLOWED_COMPONENT_TYPES
        |
        v
Component Registry (lib/components-registry/registry.tsx)
   type string -> componente React real (components/financial/*)
        |
        v
React renderiza el dashboard + banking-shell.tsx muestra el panel "MCP Activity"
```

## Demo Mode vs Production Adapter

Este prototipo separa deliberadamente dos capas:

- **Demo Mode** (usado en la demo en vivo): `lib/demo-data/customers.ts`
  contiene 5 clientes ficticios con cuentas, tarjetas, movimientos y metas.
  Las MCP tools de "Financial Data" leen de aqui. Cero dependencia de red,
  cero riesgo de que la demo falle por conectividad.
- **Production Adapter** (modelado, listo para conectar): `supabase/schema.sql`
  define las mismas entidades con Row Level Security, y
  `scripts/seed-demo-users.mjs` puede poblarlas via Supabase Auth Admin API.
  Cambiar las MCP tools de `lib/mcp/tools.ts` para leer de Supabase en vez de
  `customers.ts` es un cambio contenido a ese archivo — el resto del sistema
  (orchestrator, schema, componentes) no cambia.
- **Economic Data Tools** (`get_exchange_rate`, `get_inflation`) regresan
  valores simulados marcados explicitamente con `source: "Demo Mode"`. El
  siguiente paso natural es un adapter hacia Banxico (SIE API) e INEGI.

## Agent Architecture: un solo agente

Se evaluo orquestador + Financial Analyst + Personalization + UI Architect +
Recommendation Agent (multi-agente) contra un solo Orchestrator Agent con
tools MCP bien tipadas. Para un hackathon de ~16h se eligio **un solo agente**:

- El "razonamiento" real que distingue el producto esta en el *Situation
  Engine* y en como se componen los componentes por situacion — eso no
  necesita multiples agentes conversando entre si, necesita tools bien
  definidas y una funcion de composicion determinista y auditable.
- Multi-agente agrega latencia (varias llamadas a LLM encadenadas), superficie
  de fallos y complejidad de debugging — todo contraproducente en una demo de
  3-5 minutos ante jueces.
- Un solo agente con tool-calling real (Claude) sigue demostrando "uso real de
  IA + MCP" igual de bien, y dado que el motor de composicion es determinista
  (`buildComponentsForSituation`), el sistema funciona identico en modo
  FALLBACK (reglas, sin gastar creditos de API) y en modo LIVE (con
  `ANTHROPIC_API_KEY`, tool-calling real) — ver `docs/MCP.md`.

## Modelo de datos multidimensional

Un cliente puede tener contexto personal y de negocio simultaneamente
(`Customer.accounts[].context`, `Customer.transactions[].context`,
`Customer.goals[].context`). El `situation_banner` y `business_summary`
permiten mostrar ambos contextos sin que sean paginas separadas: el agente
decide cuando mezclarlos (ej. Valentina Cruz, estudiante + duena de Cafe
Nomada).

## Situaciones implementadas ("Modo Situacion")

`context/situations/*.json` (7 hoy): `traveling`, `paying`, `saving`,
`low_balance`, `payday`, `purchase`, `inflation`. Cada una es datos, no
codigo — agregar una nueva no toca `detect_situation` (usa `signals` +
matching de texto sobre todas las entradas de `SITUATIONS`), solo requiere
su caso en `buildComponentsForSituation`/`explainSituation`
(`lib/agent/orchestrator.ts`). `inflation` es el ejemplo mas reciente:
usa `calculate_purchasing_power_projection` + `get_inflation` para armar el
componente `comparison_chart` (ahorro nominal vs poder adquisitivo real).

## Dashboard por defecto (sin situacion detectada)

Cuando `detect_situation` no encuentra ninguna senal, `buildComponentsForSituation`
ya **no** usa un layout fijo en codigo: lee `default_components` del perfil
del cliente (`context/profiles/<perfil>.json` via `PROFILES` en
`lib/mcp/tools.ts`) y resuelve cada tipo a props concretas (kpi, account_card,
transaction_list, goal_progress, spending_chart, business_summary,
recommendation). Esto es lo que hace que la "carpeta de contexto" sea
load-bearing: cambiar `default_components` en el JSON de un perfil cambia el
dashboard por defecto de ese perfil sin tocar el orquestador.

## Fallback

Si `detect_situation` o cualquier tool de analisis lanza una excepcion,
`runOrchestrator` cae en `fallbackUISchema()` (cuentas + movimientos, sin
inventar datos) y responde con un mensaje honesto en vez de romper la app
(seccion 26 del brief).
