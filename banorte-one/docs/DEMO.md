# Guion de demo (3-5 minutos) — Banorte One

Antes de empezar: inicia sesion con cualquier usuario demo (ver README.md).
La app arranca en el cliente "Valentina Cruz" (estudiante + emprendedora).

## Paso 1 — Contexto dual (0:00-0:45)

Al entrar, la app ya muestra el dashboard por defecto de Valentina sin que
escribas nada: cuentas personales, cuenta del negocio (Cafe Nomada) y su meta
de fondo de emergencia. Señala: "Esto no es un template generico — el agente
detecto que esta persona tiene finanzas personales Y de negocio, y compuso
una vista que integra ambos".

## Paso 2 — Modo Viaje (0:45-1:45)

Escribe en el chat: **"Voy a viajar a Nueva York el proximo mes"**

La interfaz se reconstruye en vivo: aparece tipo de cambio USD/MXN, tus
cuentas, tu gasto por categoria y control de tarjetas. Maya explica por que
("Detecte que Valentina esta planeando un viaje..."). Abre el panel **MCP
Activity** (abajo del dashboard) y muestra que `detect_situation`,
`get_exchange_rate`, etc. realmente se ejecutaron — esto no es un mock visual.

## Paso 3 — Modo Ahorro (1:45-2:45)

Escribe: **"Quiero ahorrar para comprar una laptop"** (cambia primero el
"Cliente demo" en la barra lateral a **Ana Torres** para este paso — su meta
ya existe: comprar laptop).

La interfaz cambia a: progreso de la meta, ahorro mensual disponible
(calculado con `calculate_cash_flow`), gasto por categoria y una
recomendacion generada con `calculate_goal_projection` que dice
explicitamente si va a tiempo o no.

## Paso 4 — Saldo bajo / alerta financiera (2:45-3:30)

Cambia el "Cliente demo" a cualquiera con saldo personal bajo, o simplemente
escribe: **"Tengo poco saldo este mes"**. La interfaz se simplifica a una
alerta, el saldo disponible y los movimientos recientes — menos, no mas,
componentes (seccion 27 del brief: "la IA debe simplificar").

## Paso 5 — Solo negocio (3:30-4:15)

Cambia el "Cliente demo" a **Roberto Salas** (PyME, Ferreteria Salas) y
pregunta: **"Como va mi negocio?"**. Muestra `business_summary` con ingresos,
gastos y flujo neto — mismo componente reutilizado, datos distintos.

## Cierre (4:15-5:00)

Resume los "wow moments":

1. La interfaz literalmente se reconstruye por mensaje, no son pestanas
   precargadas.
2. El panel MCP Activity prueba que cada respuesta pasa por herramientas
   reales, no es un LLM alucinando texto.
3. El mismo cliente (Valentina) integra personal + negocio sin dos apps
   separadas.
4. Los componentes son una biblioteca cerrada y reutilizable (11 componentes
   cubren 6 situaciones distintas) — no HTML generado libremente por el LLM.
5. Todo funciona sin llave de API (modo FALLBACK determinista) y esta listo
   para modo LIVE con tool-calling real de Claude.

## Troubleshooting rapido antes de subir al escenario

- Si `/api/agent` regresa error: revisa la consola del navegador — el
  fallback (`fallbackUISchema`) deberia mostrarse igual, la app no se cae.
- Si el login con Supabase falla: confirma que `.env.local` tiene las llaves
  correctas y que corriste `scripts/seed-demo-users.mjs`.
