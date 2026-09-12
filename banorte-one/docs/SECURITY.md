# Seguridad — Banorte One

Principio: **la IA decide la composicion de la interfaz; la aplicacion
controla la logica y los datos.**

## Permisos de tools (ver `context/rules/security.json`)

- **read** — todas las tools implementadas en este MVP son de solo lectura
  y simulacion. Ninguna mueve dinero real ni modifica datos bancarios.
- **write_simulation** — reservado para tools como `simulate_savings_scenario`
  (documentada, no implementada aun): puede "escribir" un escenario
  hipotetico pero nunca persiste ni ejecuta nada real.
- **requires_human_authorization** — `transfer_money`, `contract_product`,
  `lock_card_permanently`: documentadas como parte de la arquitectura
  objetivo, deliberadamente **no implementadas** en el hackathon. Antes de
  existir como tool callable por el agente, requieren una confirmacion
  explicita fuera del flujo conversacional (ej. un modal con 2do factor),
  nunca "porque el LLM lo decidio".

## Que garantiza el diseño actual

1. **El LLM/agente nunca genera JSX ni HTML.** Solo puede producir un UI
   Schema (JSON) que pasa por `validateUISchema()`; cualquier `type` de
   componente fuera de `ALLOWED_COMPONENT_TYPES` se descarta silenciosamente
   (con log de advertencia), nunca se renderiza.
2. **Aislamiento por cliente.** Las MCP tools reciben siempre un `customerId`
   explicito y solo devuelven datos de ese cliente (`getCustomer(customerId)`).
   En la capa de produccion (Supabase), esto se refuerza con Row Level
   Security (`auth.uid() = user_id` en cada tabla, ver `supabase/schema.sql`)
   — un usuario autenticado fisicamente no puede leer filas de otro usuario
   aunque el agente tuviera un bug.
3. **Ninguna tool ejecuta SQL arbitrario.** Todas las consultas a datos son
   funciones TypeScript tipadas con una forma de entrada/salida fija.
4. **Service role key nunca llega al navegador.** Solo se usa en
   `scripts/seed-demo-users.mjs`, que corre en la maquina del desarrollador,
   nunca en codigo de cliente (`NEXT_PUBLIC_*`) ni en el servidor de la app.
5. **Fallback ante fallos.** Si el agente, una tool o el LLM fallan, la app
   muestra una UI base (cuentas + movimientos) en vez de romperse o inventar
   datos (`fallbackUISchema()`).
6. **Recomendaciones con disclaimer.** Todo componente `recommendation`
   incluye una leyenda de que es una sugerencia generada por IA y no
   asesoria financiera personalizada certera (evita el error de presentar
   consejos como certezas absolutas, seccion 13 del brief).

## Pendiente para produccion real (fuera de alcance del hackathon)

- Autenticacion multifactor y politicas de sesion mas estrictas.
- Audit log persistente de cada tool call (hoy vive solo en memoria durante
  la request, visible en el panel "MCP Activity").
- Deteccion de prompt injection en el mensaje del usuario antes de pasarlo al
  agente (validacion de longitud/patrones, sandboxing del contexto que se
  inyecta al LLM en modo LIVE).
- Data masking de numeros de cuenta/tarjeta completos (el demo ya solo
  expone los ultimos 4 digitos de las tarjetas).
