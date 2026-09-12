'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ArrowUpRight, Bot, ChevronDown, HelpCircle, LogOut, Menu, MessageCircle, Plus, Send, UserRound, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function BankingShell({ email }: { email: string }) {
  const router = useRouter()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState<string[]>([])

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  function sendMessage() {
    if (!draft.trim()) return
    setSent((messages) => [...messages, draft.trim()])
    setDraft('')
  }

  return (
    <main className="banking-app">
      <header className="app-header">
        <div className="brand-lockup"><Image src="/banorte-lockup.png" alt="Banorte" width={128} height={25} priority /></div>
        <nav className={mobileMenu ? 'app-nav is-open' : 'app-nav'} aria-label="Navegación principal">
          <a className="active" href="#inicio">Inicio</a><a href="#mis-productos">Mis productos</a><a href="#movimientos">Movimientos</a><a href="#ayuda">Ayuda</a>
        </nav>
        <div className="header-actions"><span className="user-email">{email}</span><button className="logout-button" onClick={signOut}><LogOut aria-hidden="true" /> Salir</button><button className="menu-button" onClick={() => setMobileMenu((open) => !open)} aria-label={mobileMenu ? 'Cerrar menú' : 'Abrir menú'}>{mobileMenu ? <X /> : <Menu />}</button></div>
      </header>
      <div className="banking-layout">
        <aside className="side-rail"><div className="side-title">Mi banca</div><a className="side-link selected" href="#chat"><MessageCircle aria-hidden="true" /> Asistente</a><a className="side-link" href="#productos"><UserRound aria-hidden="true" /> Perfil</a><a className="side-link" href="#ayuda"><HelpCircle aria-hidden="true" /> Centro de ayuda</a><div className="rail-note"><strong>¿Necesitas ayuda?</strong><span>Estamos para acompañarte.</span><a href="#contacto">Contáctanos <ArrowUpRight aria-hidden="true" /></a></div></aside>
        <section className="workspace" aria-labelledby="workspace-title"><div className="workspace-heading"><div><span className="eyebrow">ESPACIO DEL CLIENTE</span><h1 id="workspace-title">Hola, ¿en qué te ayudamos?</h1><p>Esta será la base para tus consultas y los componentes del reto Banorte.</p></div><div className="status-indicator"><span /> Sesión segura</div></div>
          <div className="chat-frame"><div className="chat-topbar"><div className="assistant-avatar"><Bot aria-hidden="true" /></div><div><strong>Maya</strong><span>Asistente financiero</span></div><button className="more-button" aria-label="Más opciones"><ChevronDown aria-hidden="true" /></button></div><div className="chat-content"><div className="welcome-message"><span className="message-label">MAYA · AHORA</span><h2>Estoy aquí para ayudarte</h2><p>Pregúntame sobre tus cuentas, tarjetas, movimientos o cualquier componente que quieras agregar a tu banca digital.</p></div>{sent.map((message) => <div className="user-message" key={message}>{message}</div>)}</div><div className="chat-composer"><button className="add-button" aria-label="Añadir archivo"><Plus aria-hidden="true" /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage() }} placeholder="Escribe tu pregunta..." aria-label="Mensaje para Maya" /><button className="send-button" onClick={sendMessage} aria-label="Enviar mensaje"><Send aria-hidden="true" /></button></div></div>
          <div className="component-grid"><div className="placeholder-card"><span>PRÓXIMO COMPONENTE</span><strong>Resumen de cuentas</strong><p>Espacio listo para conectar saldos, tarjetas y productos del cliente.</p></div><div className="placeholder-card"><span>PRÓXIMO COMPONENTE</span><strong>Movimientos recientes</strong><p>Agrega aquí tus consultas de transacciones y notificaciones.</p></div></div>
        </section>
      </div>
    </main>
  )
}
