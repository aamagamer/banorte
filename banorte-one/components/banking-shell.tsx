'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Bookmark, Bot, Check, ChevronDown, LogOut, Menu, Send, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEMO_CUSTOMERS, type Customer } from '@/lib/demo-data/customers'
import type { ComponentSpec, UISchema } from '@/lib/components-registry/schema'
import type { McpActivityEntry } from '@/lib/mcp/types'
import { renderComponent } from '@/lib/components-registry/registry'
import { COMPONENT_LABELS } from '@/lib/components-registry/labels'
import { McpActivityPanel } from '@/components/financial/mcp-activity-panel'
import { BanorteGenerating } from '@/components/banorte-generating'
import { SaveViewDialog, type SaveViewFormInput } from '@/components/save-view-dialog'
import { MyViewsPanel } from '@/components/my-views-panel'
import { ComponentToolbar } from '@/components/customize/component-toolbar'
import { HiddenTray } from '@/components/customize/hidden-tray'
import type { SavedView } from '@/lib/saved-views/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

// Sugerencias iniciales para el chat vacio. Cada frase esta redactada para
// coincidir con las "signals" reales de context/situations/*.json, asi que
// al hacer click el agente detecta una situacion real (no son botones de
// adorno) y compone la interfaz con las tools MCP correspondientes.
function starterPrompts(customer: Customer): string[] {
  const prompts: string[] = []
  if (customer.business) {
    prompts.push(`¿Cómo van mis finanzas personales y las de ${customer.business.name}?`)
  }
  prompts.push('Quiero empezar a ahorrar para comprar un carro')
  prompts.push('¿Cuánto vale mi dinero frente a la inflación?')
  prompts.push('Voy a viajar a Nueva York')
  prompts.push('Este mes no me alcanza el dinero')
  return prompts.slice(0, 4)
}

export function BankingShell({ email }: { email: string }) {
  const router = useRouter()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [customerId, setCustomerId] = useState('valentina')
  const [uiSchema, setUiSchema] = useState<UISchema | null>(null)
  const [mcpActivity, setMcpActivity] = useState<McpActivityEntry[]>([])
  const [loading, setLoading] = useState(false)
  // Fase visual del dashboard: 'building' mientras se espera al agente,
  // 'converging' durante la breve animacion de cierre (BanorteGenerating)
  // antes de mostrar la interfaz real — asi nunca se siente como que la
  // pantalla "desaparece de golpe" (ver components/banorte-generating.tsx).
  const [genPhase, setGenPhase] = useState<'idle' | 'building' | 'converging'>('idle')
  const convergeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prompt que produjo el uiSchema actualmente mostrado — es lo que se
  // guarda como "prompt" en una vista guardada (ver 'Guardar vista').
  const [currentPrompt, setCurrentPrompt] = useState('')
  // Vistas guardadas ("Mis vistas") — ver app/api/saved-views/*.
  const [savedViewId, setSavedViewId] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [myViewsOpen, setMyViewsOpen] = useState(false)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [savedViewsLoading, setSavedViewsLoading] = useState(false)
  const [savedViewsError, setSavedViewsError] = useState('')
  // "Personalizar": el usuario ajusta la vista YA generada (quitar, reordenar,
  // agrandar un componente) sin volver a pedirle nada al agente. Todo esto se
  // guarda como campos normales en uiSchema.components (hidden/span, ver
  // lib/components-registry/schema.ts), asi que "Guardar vista" ya lo
  // persiste solo, sin tocar el backend.
  const [customizeMode, setCustomizeMode] = useState(false)

  const customer = DEMO_CUSTOMERS[customerId]

  // Duracion de la animacion de convergencia (BanorteGenerating.is-converging
  // en globals.css) antes de que la interfaz real reemplace al loader — asi
  // el usuario ve "los fragmentos se concentran y la vista aparece" en vez de
  // un salto brusco de loading -> UI.
  const CONVERGE_MS = 700

  async function ask(message: string) {
    if (!message.trim()) return
    if (convergeTimeoutRef.current) {
      clearTimeout(convergeTimeoutRef.current)
      convergeTimeoutRef.current = null
    }
    setMessages((current) => [...current, { role: 'user', text: message }])
    setDraft('')
    setCurrentPrompt(message)
    setSavedViewId(null)
    setLoading(true)
    setGenPhase('building')
    try {
      // Le mandamos a Maya lo que el cliente tiene EN PANTALLA ahorita (sin
      // los componentes que oculto con "Personalizar" — esos no cuentan como
      // "lo que ve"), para que un mensaje como "cambiale el color" o "quita
      // la de movimientos" se pueda interpretar como ajuste puntual sobre
      // esta vista en vez de una situacion nueva (ver "Vista actual en
      // pantalla" en llm-orchestrator.ts y tryApplyEditIntent en
      // orchestrator.ts).
      const currentView = uiSchema ? { ...uiSchema, components: uiSchema.components.filter((c) => !c.hidden) } : null

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, customerId, currentView }),
      })
      const data = await response.json()
      setMcpActivity(data.mcpActivity ?? [])
      setMessages((current) => [...current, { role: 'assistant', text: data.reply }])
      setGenPhase('converging')
      convergeTimeoutRef.current = setTimeout(() => {
        setUiSchema(data.uiSchema)
        setGenPhase('idle')
        convergeTimeoutRef.current = null
      }, CONVERGE_MS)
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'No pude generar tu vista en este momento.' }])
      setGenPhase('idle')
    } finally {
      setLoading(false)
    }
  }

  // Al elegir una persona demo distinta arrancamos con el chat vacio: no se
  // auto-genera ningun resumen. El usuario elige una recomendacion o escribe
  // su propia peticion, y el agente diseña la interfaz a partir de eso.
  //
  // Esto es un manejador explicito (no un useEffect sobre customerId) a
  // proposito: abrir una vista guardada (openSavedView) tambien cambia
  // customerId, pero ahi SI queremos mostrar el uiSchema guardado — un efecto
  // atado a customerId lo borraria justo despues de asignarlo.
  function selectPersona(id: string) {
    if (convergeTimeoutRef.current) {
      clearTimeout(convergeTimeoutRef.current)
      convergeTimeoutRef.current = null
    }
    setCustomerId(id)
    setMessages([])
    setUiSchema(null)
    setMcpActivity([])
    setGenPhase('idle')
    setCurrentPrompt('')
    setSavedViewId(null)
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  function sendMessage() {
    ask(draft)
  }

  async function handleSaveView(input: SaveViewFormInput) {
    if (!uiSchema) throw new Error('Todavía no hay una vista generada para guardar.')
    const response = await fetch('/api/saved-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, prompt: currentPrompt, customerId, uiSchema }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error ?? 'No pudimos guardar tu vista.')
    setSavedViewId(data.view.id)
    setSaveDialogOpen(false)
  }

  async function openMyViews() {
    setMyViewsOpen(true)
    setSavedViewsLoading(true)
    setSavedViewsError('')
    try {
      const response = await fetch('/api/saved-views')
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error ?? 'No pudimos cargar tus vistas guardadas.')
      setSavedViews(data.views ?? [])
    } catch (error) {
      setSavedViewsError((error as Error).message)
    } finally {
      setSavedViewsLoading(false)
    }
  }

  // Reabre una vista guardada renderizando directamente su ui_schema — NUNCA
  // vuelve a llamar a Claude/al agente. Tambien restaura la persona demo que
  // estaba activa al guardarla, porque algunos componentes (cuentas,
  // movimientos, negocio) leen datos en vivo del customer ademas de sus props.
  function openSavedView(view: SavedView) {
    if (convergeTimeoutRef.current) {
      clearTimeout(convergeTimeoutRef.current)
      convergeTimeoutRef.current = null
    }
    setCustomerId(view.customerId)
    setCurrentPrompt(view.prompt)
    setMessages([
      { role: 'user', text: view.prompt },
      { role: 'assistant', text: view.description || `Aquí tienes tu vista guardada: "${view.name}".` },
    ])
    setUiSchema(view.uiSchema)
    setMcpActivity([])
    setGenPhase('idle')
    setLoading(false)
    setSavedViewId(view.id)
    setMyViewsOpen(false)
  }

  async function renameSavedView(id: string, name: string) {
    const response = await fetch(`/api/saved-views/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error ?? 'No se pudo renombrar la vista.')
    setSavedViews((current) => current.map((view) => (view.id === id ? data.view : view)))
  }

  async function deleteSavedView(id: string) {
    const response = await fetch(`/api/saved-views/${id}`, { method: 'DELETE' })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error ?? 'No se pudo eliminar la vista.')
    setSavedViews((current) => current.filter((view) => view.id !== id))
    if (savedViewId === id) setSavedViewId(null)
  }

  // Personalizar vista: las tres acciones de abajo solo mutan uiSchema en
  // memoria (nunca llaman a /api/agent). "Quitar" marca hidden en vez de
  // borrar del arreglo — por eso siempre se puede recuperar desde la tira de
  // "Ocultos" con los mismos datos, sin perder la vista completa.
  function hideComponent(id: string) {
    setUiSchema((current) =>
      current ? { ...current, components: current.components.map((c) => (c.id === id ? { ...c, hidden: true } : c)) } : current,
    )
  }

  function restoreComponent(id: string) {
    setUiSchema((current) =>
      current ? { ...current, components: current.components.map((c) => (c.id === id ? { ...c, hidden: false } : c)) } : current,
    )
  }

  function toggleComponentSize(id: string) {
    setUiSchema((current) =>
      current
        ? { ...current, components: current.components.map((c) => (c.id === id ? { ...c, span: c.span === 2 ? 1 : 2 } : c)) }
        : current,
    )
  }

  // Reordena solo entre los componentes VISIBLES (los ocultos no cuentan para
  // "arriba"/"abajo"). Renumera priority 1..n sobre el nuevo orden y reordena
  // el arreglo por esa misma priority, para que guardar-y-reabrir la vista
  // reproduzca el mismo orden.
  function moveComponent(id: string, direction: 'up' | 'down') {
    setUiSchema((current) => {
      if (!current) return current
      const visible = current.components.filter((c) => !c.hidden)
      const index = visible.findIndex((c) => c.id === id)
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (index === -1 || swapIndex < 0 || swapIndex >= visible.length) return current

      const reordered = [...visible]
      ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]
      const priorityById = new Map(reordered.map((c, i) => [c.id, i + 1]))

      const components = current.components
        .map((c) => (priorityById.has(c.id) ? { ...c, priority: priorityById.get(c.id)! } : c))
        .sort((a, b) => a.priority - b.priority)

      return { ...current, components }
    })
  }

  const dashboardEyebrow = genPhase !== 'idle' ? 'Diseñando tu vista…' : uiSchema ? 'Tu banca, ahora' : 'Espacio del cliente'
  const dashboardTitle = uiSchema?.title ?? `Hola, ${customer.name.split(' ')[0]}`

  return (
    <main className="banking-app">
      <header className="app-header">
        <div className="brand-lockup"><Image src="/banorte-lockup.png" alt="Banorte" width={128} height={25} priority /></div>
        <nav className={mobileMenu ? 'app-nav is-open' : 'app-nav'} aria-label="Navegación principal">
          <a className="active" href="#inicio">Inicio</a><a href="#mis-productos">Mis productos</a><a href="#movimientos">Movimientos</a><a href="#ayuda">Ayuda</a>
        </nav>
        <div className="header-actions"><button type="button" className="my-views-trigger" onClick={openMyViews}><Bookmark aria-hidden="true" /> Mis vistas</button><span className="user-email">{email}</span><button className="logout-button" onClick={signOut}><LogOut aria-hidden="true" /> Salir</button><button className="menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label={mobileMenu ? 'Cerrar menú' : 'Abrir menú'}>{mobileMenu ? <X /> : <Menu />}</button></div>
      </header>

      <div className="workbench">
        <section className="chat-panel" aria-label="Asistente Maya">
          <div className="chat-panel-top">
            <div className="chat-avatar"><Bot aria-hidden="true" /></div>
            <div>
              <strong>Maya</strong>
              <span>Diseña tu banca mientras conversas</span>
            </div>
            <button className="chat-collapse" aria-label="Minimizar"><ChevronDown aria-hidden="true" /></button>
          </div>

          <div className="demo-persona-switcher">
            <label htmlFor="demo-persona">Cliente demo</label>
            <select id="demo-persona" value={customerId} onChange={(event) => selectPersona(event.target.value)}>
              {Object.values(DEMO_CUSTOMERS).map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.profile}</option>
              ))}
            </select>
          </div>

          <div className="chat-scroll">
            {messages.length === 0 ? (
              <div className="chat-greeting">
                <h2>¡Hola! Soy Maya, tu asistente financiera.</h2>
                <p>Cuéntame tu situación y tu banca se adapta en tiempo real, o elige una recomendación para empezar:</p>
                <div className="starter-suggestions">
                  {starterPrompts(customer).map((prompt) => (
                    <button key={prompt} type="button" className="starter-chip" onClick={() => ask(prompt)}>{prompt}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chat-messages">
                {messages.map((message, index) => (
                  <div className={message.role === 'user' ? 'chat-bubble user' : 'chat-bubble assistant'} key={index}>{message.text}</div>
                ))}
                {loading && (
                  <div className="chat-bubble assistant chat-typing">
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    <span className="sr-only">Maya está pensando</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {uiSchema && uiSchema.nextBestActions.length > 0 && (
            <div className="next-best-actions">
              {uiSchema.nextBestActions.map((action) => (
                <button key={action.action} type="button" onClick={() => ask(action.label)}>{action.label}</button>
              ))}
            </div>
          )}

          <div className="chat-composer">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage() }}
              placeholder="Escriba algo..."
              aria-label="Mensaje para Maya"
            />
            <button className="send-button" onClick={sendMessage} aria-label="Enviar mensaje"><Send aria-hidden="true" /></button>
          </div>
        </section>

        <section className="dashboard-panel" aria-label="Tu banca en tiempo real">
          <div className="dashboard-heading">
            <div>
              <span className="eyebrow">{dashboardEyebrow}</span>
              <h1>{dashboardTitle}</h1>
              {uiSchema?.explanation && <p>{uiSchema.explanation}</p>}
            </div>
            <div className="dashboard-heading-actions">
              {uiSchema && genPhase === 'idle' && uiSchema.components.length > 0 && (
                <button
                  type="button"
                  className={`customize-toggle${customizeMode ? ' is-active' : ''}`}
                  onClick={() => setCustomizeMode((open) => !open)}
                  aria-pressed={customizeMode}
                >
                  <SlidersHorizontal aria-hidden="true" /> {customizeMode ? 'Listo' : 'Personalizar'}
                </button>
              )}
              {uiSchema && genPhase === 'idle' && (
                <button
                  type="button"
                  className={`save-view-trigger${savedViewId ? ' is-saved' : ''}`}
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={Boolean(savedViewId)}
                >
                  {savedViewId ? (
                    <>
                      <Check aria-hidden="true" /> Vista guardada
                    </>
                  ) : (
                    <>
                      <Bookmark aria-hidden="true" /> Guardar vista
                    </>
                  )}
                </button>
              )}
              <div className="status-indicator"><span /> Sesión segura</div>
            </div>
          </div>

          {genPhase !== 'idle' ? (
            <BanorteGenerating phase={genPhase === 'converging' ? 'converging' : 'building'} />
          ) : uiSchema && uiSchema.components.length > 0 ? (
            <>
              {customizeMode && (
                <HiddenTray hidden={uiSchema.components.filter((c) => c.hidden)} onRestore={restoreComponent} />
              )}
              <div className="component-grid">
                {(() => {
                  const visible = uiSchema.components.filter((c: ComponentSpec) => !c.hidden)
                  return visible.map((spec, index) => {
                    const rendered = renderComponent(spec, customer)
                    if (!rendered) return null
                    const isExpanded = spec.span === 2
                    const cardClass = [
                      'dashboard-card-enter',
                      'component-card-shell',
                      customizeMode && 'is-customizable',
                      isExpanded && 'dashboard-card-span-2',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <div key={rendered.key} className={cardClass} style={{ animationDelay: `${index * 70}ms` }}>
                        {rendered.element}
                        {customizeMode && (
                          <ComponentToolbar
                            label={COMPONENT_LABELS[spec.type] ?? spec.type}
                            canMoveUp={index > 0}
                            canMoveDown={index < visible.length - 1}
                            isExpanded={isExpanded}
                            onMoveUp={() => moveComponent(spec.id, 'up')}
                            onMoveDown={() => moveComponent(spec.id, 'down')}
                            onToggleSize={() => toggleComponentSize(spec.id)}
                            onHide={() => hideComponent(spec.id)}
                          />
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </>
          ) : (
            <div className="dashboard-empty">
              <Sparkles aria-hidden="true" />
              <p>Escribe tu situación o elige una recomendación en el chat. Maya va a diseñar la vista con los indicadores, gráficas y tarjetas que mejor la representen.</p>
            </div>
          )}

          <McpActivityPanel entries={mcpActivity} />
        </section>
      </div>

      <SaveViewDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} onSave={handleSaveView} />
      <MyViewsPanel
        open={myViewsOpen}
        onOpenChange={setMyViewsOpen}
        views={savedViews}
        loading={savedViewsLoading}
        error={savedViewsError}
        onOpenView={openSavedView}
        onRename={renameSavedView}
        onDelete={deleteSavedView}
      />
    </main>
  )
}