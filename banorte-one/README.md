# Banorte One

Prototipo de hackathon (HackMTY — Reto Banorte): una banca digital cuya interfaz
se genera y reconfigura en tiempo real segun el contexto y la situacion del
usuario, orquestada por un agente de IA sobre un MCP (Model Context Protocol).

> "No importa quien eres solamente. Importa que estas haciendo ahora."

## Como levantar el proyecto

```bash
pnpm install
cp .env.local.example .env.local   # llena las variables de Supabase (ver abajo)
pnpm dev
```

Abre http://localhost:3000. El login usa Supabase Auth (email + password).

### Variables de entorno

Ver `.env.local.example`. Necesitas, del panel de tu proyecto en
Supabase (Project Settings > API):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` — solo para `scripts/seed-demo-users.mjs`, nunca se usa en el navegador.

### Crear las tablas y los usuarios demo

1. En Supabase, abre **SQL Editor** y corre el contenido de `supabase/schema.sql`.
2. Con `.env.local` ya lleno, corre:

   ```bash
   node scripts/seed-demo-users.mjs
   ```

   Esto crea (o actualiza) 5 usuarios demo en Supabase Auth y siembra sus
   cuentas, tarjetas, movimientos y metas en las tablas de `schema.sql`.
   La contrasena demo por default es `BanorteOne2026!` para los 5 (cambiala
   con `DEMO_PASSWORD=otra node scripts/seed-demo-users.mjs`).

   | Cliente demo | Email | Perfil |
   |---|---|---|
   | Valentina Cruz | valentina.demo@banorteone.mx | Estudiante + emprendedora (Cafe Nomada) |
   | Ana Torres | ana.demo@banorteone.mx | Estudiante |
   | Carlos Mendoza | carlos.demo@banorteone.mx | Padre de familia |
   | Mariana Lopez | mariana.demo@banorteone.mx | Profesionista |
   | Roberto Salas | roberto.demo@banorteone.mx | PyME (Ferreteria Salas) |

3. Inicia sesion en la app con cualquiera de esos correos y la contrasena demo.

**Nota importante:** el agente/orquestador de este prototipo lee sus datos de
`lib/demo-data/customers.ts` (Demo Mode), no directamente de Supabase, para
que la demo en vivo no dependa de la red durante la presentacion. Las tablas
de Supabase son la capa de "produccion" ya modelada y lista (ver
`docs/ARCHITECTURE.md`, seccion Demo Mode vs Production Adapter). Dentro de
la app puedes cambiar de "Cliente demo" en la barra lateral para ver cualquiera
de los 5 perfiles sin tener que cerrar sesion.

## Estructura del proyecto — donde va cada cosa

```
banorte-one/
├── context/                     # Context Engine (perfiles, situaciones, reglas)
│   ├── profiles/                # 1 JSON por tipo de cliente (student, parent, ...)
│   ├── situations/               # 1 JSON por "Modo Situacion" (traveling, saving, ...)
│   └── rules/                    # personalization.json (resolucion de conflictos),
│                                  # security.json (permisos de tools)
├── lib/
│   ├── mcp/                      # Las MCP tools (catalogo) + registry que las ejecuta
│   │   ├── types.ts
│   │   ├── tools.ts               # <- agregar tools nuevas aqui
│   │   └── registry.ts
│   ├── agent/
│   │   └── orchestrator.ts        # El agente unico: decide que tools llamar y arma el UI Schema
│   ├── components-registry/
│   │   ├── schema.ts              # Tipos + validacion del UI Schema
│   │   └── registry.tsx           # Mapa "type" string -> componente React real
│   └── demo-data/
│       └── customers.ts           # Los 5 clientes demo (Demo Mode adapter)
├── components/
│   └── financial/                 # <- LA BIBLIOTECA DE COMPONENTES vive aqui
│       ├── kpi-card.tsx, account-card.tsx, goal-progress.tsx, ...
│       └── mcp-activity-panel.tsx # Panel "MCP ACTIVITY" para la demo ante el jurado
├── app/
│   └── api/agent/route.ts         # Endpoint que llama al orquestador
├── supabase/
│   └── schema.sql                 # Tablas + Row Level Security
├── scripts/
│   └── seed-demo-users.mjs        # Crea usuarios + siembra datos en Supabase
└── docs/
    ├── ARCHITECTURE.md
    ├── MCP.md
    ├── SECURITY.md
    └── DEMO.md
```

**Regla para agregar un componente nuevo a la biblioteca:** 1) crea el
componente en `components/financial/`, 2) registralo en
`lib/components-registry/registry.tsx`, 3) agrega su `type` a
`ALLOWED_COMPONENT_TYPES` en `lib/mcp/tools.ts`, 4) opcionalmente referencialo
desde `context/situations/<alguna>.json` para que el agente lo use.

**Regla para agregar una situacion nueva ("Modo X"):** crea
`context/situations/mi_situacion.json` con `signals`, `priority`,
`preferred_components` y `next_best_actions`, importala en
`lib/mcp/tools.ts` (`SITUATIONS`), y agrega su caso en
`buildComponentsForSituation` de `lib/agent/orchestrator.ts`.

**Estado actual (11 componentes, 7 situaciones):**

- Componentes: `situation_banner`, `kpi`, `account_card`, `transaction_list`
  (tabla real), `goal_progress`, `spending_chart`, `comparison_chart` (grafica
  de linea SVG, ahorro nominal vs poder adquisitivo real), `alert`,
  `recommendation`, `exchange_rate`, `card_controls`, `business_summary`.
- Situaciones: `traveling`, `paying`, `saving`, `low_balance`, `payday`,
  `purchase`, `inflation`.
- Sin situacion detectada, el dashboard por defecto ya no es un layout fijo:
  se arma leyendo `default_components` del perfil del cliente en
  `context/profiles/<perfil>.json` (ver `docs/ARCHITECTURE.md`).

Ver tambien `docs/ARCHITECTURE.md`, `docs/MCP.md`, `docs/SECURITY.md` y
`docs/DEMO.md`.
