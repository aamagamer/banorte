'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Bot, ChevronDown, LogOut, Menu, Send, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEMO_CUSTOMERS, type Customer } from '@/lib/demo-data/customers'
import type { UISchema } from '@/lib/components-registry/schema'
import type { McpActivityEntry } from '@/lib/mcp/types'
import { renderComponent } from '@/lib/components-registry/registry'
import { McpActivityPanel } from '@/components/financial/mcp-activity-panel'

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

const SKELETON_CARDS = [0, 1, 2, 3]

export function BankingShell({ email }: { email: string }) {
  const router = useRouter()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [customerId, setCustomerId] = useState('valentina')
  const [uiSchema, setUiSchema] = useState<UISchema | null>(null)
  const [mcpActivity, setMcpActivity] = useState<McpActivityEntry[]>([])
  const [loading, setLoading] = useState(false)

  const customer = DEMO_CUSTOMERS[customerId]

  async function ask(message: string) {
    if (!message.trim()) return
    setMessages((current) => [...current, { role: 'user', text: message }])
    setDraft('')
    setLoading(true)
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, customerId }),
      })
      const data = await response.json()
      setUiSchema(data.uiSchema)
      setMcpActivity(data.mcpActivity ?? [])
      setMessages((current) => [...current, { role: 'assistant', text: data.reply }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', text: 'No pude generar tu vista en este momento.' }])
    } finally {
      setLoading(false)
    }
  }

  // Al entrar (o al cambiar de persona demo) arrancamos con el chat vacio:
  // no se auto-genera ningun resumen. El usuario elige una recomendacion o
  // escribe su propia peticion, y el agente diseña la interfaz a partir de eso.
  useEffect(() => {
    setMessages([])
    setUiSchema(null)
    setMcpActivity([])
  }, [customerId])

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  function sendMessage() {
    ask(draft)
  }

  const dashboardEyebrow = loading ? 'Diseñando tu vista…' : uiSchema ? 'Tu banca, ahora' : 'Espacio del cliente'
  const dashboardTitle = uiSchema?.title ?? `Hola, ${customer.name.split(' ')[0]}`

  return (
    <main className="banking-app">
      <header className="app-header">
        <div className="brand-lockup"><Image src="/banorte-lockup.png" alt="Banorte" width={128} height={25} priority /></div>
        <nav className={mobileMenu ? 'app-nav is-open' : 'app-nav'} aria-label="Navegación principal">
          <a className="active" href="#inicio">Inicio</a><a href="#mis-productos">Mis productos</a><a href="#movimientos">Movimientos</a><a href="#ayuda">Ayuda</a>
        </nav>
        <div className="header-actions"><span className="user-email">{email}</span><button className="logout-button" onClick={signOut}><LogOut aria-hidden="true" /> Salir</button><button className="menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label={mobileMenu ? 'Cerrar menú' : 'Abrir menú'}>{mobileMenu ? <X /> : <Menu />}</button></div>
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
            <select id="demo-persona" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
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
            <div className="status-indicator"><span /> Sesión segura</div>
          </div>

          {loading ? (
            <div className="dashboard-skeleton" aria-hidden="true">
              {SKELETON_CARDS.map((i) => (
                <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="skeleton-line short" />
                  <span className="skeleton-line long" />
                  <span className="skeleton-bar" />
                </div>
              ))}
            </div>
          ) : uiSchema && uiSchema.components.length > 0 ? (
            <div className="component-grid">
              {uiSchema.components.map((spec, index) => {
                const rendered = renderComponent(spec, customer)
                if (!rendered) return null
                return (
                  <div key={rendered.key} className="dashboard-card-enter" style={{ animationDelay: `${index * 70}ms` }}>
                    {rendered.element}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="dashboard-empty">
              <Sparkles aria-hidden="true" />
              <p>Escribe tu situación o elige una recomendación en el chat. Maya va a diseñar la vista con los indicadores, gráficas y tarjetas que mejor la representen.</p>
            </div>
          )}

          <McpActivityPanel entries={mcpActivity} />
        </section>
      </div>
    </main>
  )
}
