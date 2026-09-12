# Interfaz Financiera Adaptativa — Banorte × HackMTY

> El usuario no debería adaptarse a la aplicación. La aplicación debería adaptarse al usuario.

Un agente de IA que, en vez de responder con texto, **decide y genera la interfaz financiera** que mejor representa la respuesta — en tiempo real, sobre una biblioteca de componentes predefinida, usando MCP como el único puente entre el razonamiento del agente y los datos financieros.

Este repo es un prototipo **funcional**, no solo un documento de diseño: `npm install && npm run dev:web` levanta el agente, el servidor MCP (proceso real, protocolo stdio) y el frontend Next.js que renderiza lo que el agente compone.

---

## A. Product Vision

No construimos un chatbot bancario. Construimos una capa de **composición de interfaz** entre un agente con herramientas MCP y una biblioteca de componentes React seguros y tipados. El LLM nunca genera HTML/JSX — genera una estructura declarativa (`UIGenerationResult`, ver sección H) que la app renderiza. Eso es lo que hace que la interfaz sea "adaptativa" y no solo "un dashboard con un chat pegado".

## B. Winning Concept

**"Una banca que se transforma alrededor de cada usuario."** El demo central es Valentina Cruz: estudiante del Tec + dueña de Café Nómada. Una sola persona, dos contextos financieros, una interfaz que se reconfigura según de cuál (o cuáles) se está hablando — sin menús, sin navegación manual.

## Diferenciador técnico (sección 17 del brief)

El error a evitar era *Chat + Dashboard + LLM*. Lo que realmente cambia el juego aquí:

1. **El LLM nunca decide layout libremente** — elige entre un catálogo fijo de 15 tipos de componente (`shared/src/ui-schema.ts`), y esa elección se valida server-side antes de aceptarse (`compose_dashboard` en el MCP server rechaza tipos inválidos).
2. **Cada número en pantalla es trazable a una tool call MCP real** — el protocolo de UI exige `dataProvenance: { real, inferred, recommended }`, y la UI tiene un desplegable "¿de dónde salen estos datos?" que lo muestra.
3. **El usuario puede des-componer lo que el agente compuso** (quitar/mover tarjetas) sin pasar por otro turno de LLM — pero esa edición se sincroniza de vuelta al estado MCP (`remove_component`), así que la próxima respuesta del agente parte de lo que el usuario dejó, no de cero.

---

## C. User Journey (demo de referencia)

Ver **sección L (Demo Script)** — está escrito contra los flujos que de verdad corrimos en este repo, no contra números inventados.

---

## D. Architecture

```
USER (chat, español natural)
   │
   ▼
NEXT.JS APP (web/)
   │  POST /api/chat
   ▼
ORCHESTRATOR AGENT (web/src/lib/agent.ts)
   │  Claude tool-calling loop (modo LIVE) o motor de reglas (modo FALLBACK)
   │  ambos hablan el mismo protocolo MCP — ver sección I
   ▼
MCP CLIENT (web/src/lib/mcp-client.ts) ──stdio──▶ MCP SERVER (mcp-server/, proceso Node separado)
                                                        │
                                    ┌───────────────────┼────────────────────┐
                                    ▼                    ▼                    ▼
                          Financial/Analysis Tools   Economic Tools     UI + User-Context Tools
                          (shared/src/demo-data.ts = Demo Data Adapter — swap por Banorte Sandbox)
   ▲
   │  UIGenerationResult (JSON declarativo, ver sección H)
   ▼
COMPONENT REGISTRY (web/src/components/Dashboard.tsx + FinanceComponents.tsx)
   │
   ▼
GENERATED UI (React, en el navegador del usuario)
```

La separación crítica: el agente **nunca** importa `demo-data.ts` directamente. Todo pasa por el MCP server como proceso hijo real (`StdioServerTransport` / `StdioClientTransport` del SDK oficial `@modelcontextprotocol/sdk`). Cambiar de datos simulados a Banorte Sandbox real es reemplazar `shared/src/demo-data.ts` por un `ProductionAdapter` — ninguna tool cambia de firma.

---

## E/F. MCP Architecture & Tool Catalog

Servidor: `mcp-server/src/index.ts` — **38 tools** registradas vía `McpServer.registerTool` (SDK 1.30). Agrupadas:

| Grupo | Tools |
|---|---|
| Financial Data (read-only) | `get_accounts`, `get_account_balance`, `get_transactions`, `get_transaction_summary`, `get_income`, `get_expenses`, `get_recurring_payments` |
| Financial Analysis | `calculate_cash_flow`, `calculate_savings_rate`, `calculate_spending_by_category`, `calculate_emergency_fund`, `calculate_financial_health`, `compare_periods` |
| Economic Data (simulado, etiquetado) | `get_inflation`, `get_interest_rates`, `get_exchange_rate`, `get_economic_indicator` |
| Product | `get_savings_products`, `get_credit_products`, `get_investment_products`, `compare_products` |
| Goals | `create_financial_goal`, `update_financial_goal`, `calculate_goal_projection`, `simulate_savings_scenario`, `list_goals` |
| UI Composer | `list_components`, `recommend_components`, `compose_dashboard`, `get_current_dashboard`, `remove_component`, `move_component`, `configure_component` |
| User Context | `get_user_profile`, `get_user_financial_context`, `get_user_preferences`, `set_user_preference`, `switch_financial_context` |

Cada tool tiene `inputSchema` en Zod (validación real, no solo documentación) y devuelve JSON estructurado. Ejemplo (`calculate_emergency_fund`):

```ts
// input:  { context?: "personal" | "business" }
// output: { context, liquidAssets, monthlyExpensesAvg, monthsCovered, targetMonths, targetAmount, gap }
```

**Todas las tools de este prototipo son de lectura o simulación** (sección 16 del brief). No existe ninguna tool capaz de mover dinero real o contratar un producto — eso queda fuera de alcance del hackathon a propósito (ver sección P).

---

## G. Component Library

`shared/src/ui-schema.ts` define 15 tipos, cada uno con props tipadas (TypeScript, no `any`) e implementados en `web/src/components/FinanceComponents.tsx`:

**Indicadores:** `kpi_card`, `balance_card`, `savings_progress`, `cash_flow_card`, `emergency_fund_progress`, `business_revenue_card`
**Visualización:** `line_chart`, `donut_chart`, `comparison_chart` (Recharts, paleta categórica fija y validada — ver nota de accesibilidad abajo)
**Financieros:** `financial_goal_card`, `transaction_list`
**Inteligentes:** `ai_insight`, `ai_recommendation` (con disclaimer obligatorio), `scenario_simulator` (interactivo, slider client-side)
**Interacción:** `context_switcher`

Nota de diseño: los colores de las gráficas siguen un orden categórico fijo (azul → naranja → aqua → amarillo…) nunca reasignado por rango, con paleta validada para daltonismo — ningún componente usa "rainbow colors" ni doble eje Y.

---

## H. UI Generation Protocol

Esto es lo único que el agente puede devolver como salida de interfaz (`shared/src/ui-schema.ts`, tipo `UIGenerationResult`):

```json
{
  "layout": "dashboard",
  "activeContext": "personal",
  "narrative": "Vas al 62% de tu meta \"Comprar un automóvil\"...",
  "components": [
    { "id": "goal-card", "type": "financial_goal_card", "priority": 1,
      "props": { "name": "Comprar un automóvil", "targetAmount": 90000, "currentAmount": 55800, "targetDate": "2027-07-10", "status": "behind" } },
    { "id": "goal-simulator", "type": "scenario_simulator", "priority": 4, "props": { ... } }
  ],
  "dataProvenance": {
    "real": ["goals", "accounts"],
    "inferred": ["calculate_goal_projection", "calculate_cash_flow"],
    "recommended": []
  }
}
```

Se transmite al MCP server vía `compose_dashboard({ uiJson: JSON.stringify(...) })`, que **valida cada `type` contra el catálogo real** antes de aceptar — el agente no puede alucinar un componente que no existe.

---

## I. Agent Architecture

**Decisión: un solo agente orquestador con 38 tools bien diseñadas, no 5 agentes especializados.**

Justificación (priorizando velocidad y demostrabilidad de hackathon, sección 10 del brief):
- Multi-agente añade latencia (cada hand-off es una llamada más al LLM) y superficie de fallo — en una demo en vivo, cada punto de coordinación entre agentes es un lugar donde algo puede salir mal frente al jurado.
- Un solo agente con tool-calling real *ya* demuestra "IA que razona con datos y decide UI" — el jurado no puede ver la arquitectura interna, solo el resultado; el multi-agente es más caro de construir por el mismo efecto observable.
- El "razonamiento especializado" (qué componentes recomendar, cómo calcular finanzas) no vive en agentes separados sino en **tools deterministas** (`recommend_components`, `calculate_*`) — más barato, más testeable, y el agente sigue siendo quien decide cuáles usar y cómo combinarlas.

`web/src/lib/agent.ts` implementa dos modos detrás de la misma interfaz `runAgentTurn()`:
- **LIVE**: loop real de tool-calling con Claude (`@anthropic-ai/sdk`), hasta 8 iteraciones, termina cuando el modelo llama `compose_dashboard` y responde texto final.
- **FALLBACK**: motor de reglas determinista que llama las *mismas* tools MCP y respeta el *mismo* contrato — existe para poder desarrollar/demostrar sin gastar créditos de API o sin internet. Se activa automáticamente si `ANTHROPIC_API_KEY` no está seteada, y la UI lo marca visiblemente ("modo offline").

---

## J. Data Model

`shared/src/types.ts` — modelos completos para `Account`, `Transaction`, `RecurringPayment`, `FinancialGoal`, `UserProfile` (con `StudentContext` y `EntrepreneurContext` anidados), `UserPreferences`, `EconomicIndicator`, `FinancialProduct`, `FinancialContextSnapshot`. El modelo de usuario refleja explícitamente la multidimensionalidad de la sección 12 del brief: un `UserProfile` puede tener `isStudent` y `isEntrepreneur` simultáneamente, cada uno con su propio sub-contexto, y cada `Account`/`Transaction`/`Goal` está etiquetado con `context: "personal" | "business"`.

---

## K. MCP Flow — ejemplo real

Para `"¿Y qué pasa con la inflación?"` (intent detectado: `inflation_check` en modo fallback; en modo LIVE el propio Claude decide esta secuencia):

```
1. get_inflation()                                    → { value: 4.3, source: "INEGI (simulado)", ... }
2. calculate_savings_rate({ context: "personal",
                             months: 6 })               → { savingsRatePct: X }
3. list_goals({ context: "personal" })                 → [{ id: "goal-car", ... }]
4. simulate_savings_scenario({ goalId, monthlyContribution })
                                                         → { projectionSeries: [{x,y}, ...] }
5. compose_dashboard({ uiJson: {
     components: [kpi_card(ahorro nominal), kpi_card(inflación),
                  line_chart(ahorro proyectado), ai_insight(poder adquisitivo real)]
   }})
6. get_current_dashboard() → se devuelve al frontend
```

Todo el paso 1-5 ocurre sobre el protocolo MCP real (JSON-RPC sobre stdio) — se puede ver en vivo corriendo `npm run test:smoke` dentro de `mcp-server/`.

---

## L. Demo Script (3–5 min) — probado contra el código real de este repo

**Setup:** modo fallback (sin costo de API) o LIVE con `ANTHROPIC_API_KEY`. Persona: Valentina Cruz, estudiante Tec de Monterrey + dueña de Café Nómada.

1. **(30s)** Abrir la app. Escribir *"hola, muéstrame mi dashboard"*. La IA responde: *"Detecté que manejas tus finanzas personales y también la operación de un pequeño negocio..."* — aparecen KPIs de personal, negocio, ahorro y flujo, con un selector "Mi vida / Mi negocio".
2. **(60s)** *"Quiero saber si estoy ahorrando suficiente para comprar un auto."* La interfaz se reconstruye: tarjeta de meta (62%), barra de progreso, flujo mensual, un **simulador interactivo** (slider) y un insight de IA que compara lo que se necesita vs. la capacidad real de ahorro — sin inventar el dato, viene de `calculate_goal_projection` + `calculate_cash_flow`.
3. **(45s)** *"¿Y qué pasa con la inflación?"* Nuevos componentes: inflación (INEGI, dato simulado y etiquetado como tal), tasa de ahorro nominal, gráfica de línea, insight de poder adquisitivo real.
4. **(45s)** *"Ahora quiero ver solamente mi negocio."* Contexto completo cambia: tarjeta de ingreso/gasto/utilidad de Café Nómada, dona de gasto operativo por categoría, movimientos recientes — cero clics de navegación, solo lenguaje natural.
5. **(45s)** *"¿Qué me recomiendas hacer?"* Tarjeta de recomendaciones con **disclaimer explícito** ("no es asesoría financiera personalizada"), cada recomendación con su razón basada en datos reales, más el fondo de emergencia como base de cualquier consejo.
6. **(30s, opcional)** Pasar el mouse sobre una tarjeta y quitarla con el botón ×; abrir "¿de dónde salen estos datos?" para mostrar la separación real / inferido / recomendado.

---

## M. Judge Wow Moments

1. **El layout cambia completo entre turnos sin que el usuario navegue nada** — de KPIs generales a un simulador interactivo a una vista 100% distinta de negocio, todo por lenguaje natural.
2. **Trazabilidad total**: cada tarjeta puede explicar de qué tool salió su dato (panel "de dónde salen estos datos").
3. **El componente scenario_simulator es interactivo de verdad** (slider client-side) — no es una captura estática generada por el LLM.
4. **`compose_dashboard` rechaza componentes inválidos** — se puede demostrar en vivo que el LLM está *constreñido* a un catálogo real, no generando HTML libre.
5. **Doble contexto financiero coherente**: el retiro de utilidades del negocio (`owner_draw`) aparece como ingreso en personal Y como gasto en negocio — los dos contextos cuadran entre sí, no son datos inventados por separado.

---

## N. Implementation Roadmap

**Ya construido en este repo (equivalente a las 3 franjas del brief, hecho de una vez dado el alcance de ~16h aprobado):**
- ✅ MVP 4h: 1 flujo end-to-end (meta de ahorro) con 4 componentes — **listo**
- ✅ MVP 8h: agente con tool-calling real + MCP server completo + 8-10 componentes + 3 flujos — **listo** (15 componentes, 38 tools, 5 flujos)
- ✅ MVP 16h: dual-context personal/negocio, modo LIVE + FALLBACK, protocolo de UI validado server-side, disclaimers de asesoría — **listo**

**Siguiente (fuera de este build, para después del hackathon o si sobra tiempo):**
- Conectar `ANTHROPIC_API_KEY` real y grabar el demo en modo LIVE (hoy validado en modo FALLBACK por limitaciones de este entorno de desarrollo).
- Persistencia real (hoy el estado vive en memoria del proceso MCP — se reinicia si el servidor se reinicia).
- `ProductionAdapter` real contra Banorte Sandbox + Banxico/INEGI.
- Auth real de usuario (hoy hay un único usuario demo implícito).

---

## O. Risks

| Riesgo | Mitigación implementada |
|---|---|
| El LLM alucina un tipo de componente que no existe | `compose_dashboard` valida `type` contra `COMPONENT_TYPES` antes de aceptar (mcp-server/src/index.ts) |
| El LLM inventa cifras financieras | Regla explícita en el system prompt + arquitectura que solo permite números provenientes de tool results |
| Falla de red / sin créditos de API durante la demo en vivo | Modo FALLBACK determinista, mismas tools MCP, mismo contrato — demo sigue funcionando |
| Recomendaciones financieras leídas como consejo garantizado | `ai_recommendation` requiere `disclaimer` en el protocolo; el system prompt lo exige explícitamente |
| Child process de MCP no arranca (path relativo roto) | `MCP_SERVER_ENTRY` como override por env var en `mcp-client.ts` |

## P. Hackathon Strategy — qué NO construimos (a propósito)

- **No** hicimos autenticación/multi-usuario real — un usuario demo fijo es suficiente para contar la historia.
- **No** conectamos Banorte Sandbox real — la capa de adapter existe (`shared/src/demo-data.ts`) pero cablear credenciales reales no cambia lo que el jurado evalúa (razonamiento del agente + arquitectura MCP + UI adaptativa).
- **No** implementamos multi-agente — ver justificación en sección I.
- **No** construimos ninguna tool de escritura real (transferencias, contratación de productos) — el brief pide explícitamente que eso requiera una capa de autorización humana que no cabe en el alcance de un hackathon responsable.
- **No** hicimos dark mode ni theming configurable — no mueve la aguja frente al jurado en el tiempo disponible.

---

## Evaluación crítica (sección 22 del brief)

Autoevaluación honesta, no complaciente:

| Criterio | 1-10 | Por qué |
|---|---|---|
| Innovación | 7 | La idea central (IA que decide UI, no solo contenido) es fuerte; la ejecución con catálogo validado la hace creíble, pero el concepto en sí no es inédito en 2026. |
| Uso real de IA | 7 (LIVE) / 4 (si se demo solo en FALLBACK) | El tool-calling real con Claude es lo que sostiene la historia — **demostrar en modo LIVE es crítico**, el fallback es para desarrollo, no para el jurado. |
| Uso de MCP | 8 | MCP no es decorativo: es un proceso real, 38 tools, protocolo stdio real, separación estricta agente/datos. |
| Utilidad | 6 | Los cálculos son razonables pero simplificados (ej. el "score de salud financiera" es ilustrativo, no un modelo real). |
| Experiencia de usuario | 7 | Fluida en los flujos probados; con más tiempo, animaciones de transición entre estados de dashboard elevarían mucho el "wow". |
| Viabilidad | 6 | El concepto es viable; el camino a producción real (auth, datos reales, cumplimiento regulatorio de "asesoría financiera") es largo. |
| Dificultad técnica | 7 | Loop de tool-calling + MCP real + protocolo de UI validado no es trivial, pero tampoco es investigación de frontera. |
| Impacto para Banorte | 6 | Fuerte como demo de producto; requiere trabajo serio de producto/legal antes de ser real. |
| Capacidad de sorprender al jurado | 7 | El momento "quita esto, cambia a mi negocio, sin recargar nada" suele sorprender si se ejecuta fluido. |

**Qué lo llevaría a 9-10:** (1) demo en modo LIVE grabado como respaldo por si la conexión falla en vivo, (2) una animación de transición entre estados del dashboard (hoy es un re-render instantáneo, funcional pero poco "wow" visualmente), (3) al menos una tool conectada a un dato semi-real (aunque sea Banxico público, no todo simulado), (4) mostrar explícitamente en el pitch el momento donde `compose_dashboard` rechaza un tipo de componente inválido — es la prueba más contundente de que esto no es "un LLM generando HTML".

---

## Setup

```bash
npm install                      # instala las 3 workspaces (shared, mcp-server, web)
cp web/.env.example web/.env.local
# opcional: agrega ANTHROPIC_API_KEY en web/.env.local para modo LIVE
npm run dev:web                  # levanta Next.js; el MCP server se spawnea automáticamente
```

Abre `http://localhost:3000`. Sin `ANTHROPIC_API_KEY`, corre en modo FALLBACK (gratis, offline, mismas tools MCP) — ideal para seguir desarrollando la UI o los tools sin gastar créditos.

Smoke test del MCP server solo (sin frontend):
```bash
cd mcp-server && npm run test:smoke
```

### Estructura

```
shared/        tipos + protocolo de UI + demo data adapter (paquete compartido)
mcp-server/    servidor MCP real (stdio), 38 tools, motor de recomendación
web/           Next.js — agente orquestador, cliente MCP, componentes React, chat UI
```
