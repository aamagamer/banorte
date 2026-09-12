import Image from 'next/image'
import { BanorteLogin } from '@/components/banorte-login'

export default function Page() {
  return (
    <main className="login-page">
      <header className="public-header"><div className="brand-lockup"><Image src="/banorte-lockup.png" alt="Banorte" width={160} height={31} priority /></div><nav aria-label="Navegación pública"><a href="#personal">Personal</a><a href="#preferente">Preferente</a><a href="#empresas">Empresas</a><a href="#ayuda">Ayuda</a></nav><div className="public-actions"><a href="#cliente">Hazte cliente</a><a className="outline-action" href="#banca">Banca en línea</a></div></header>
      <section className="hero-login" aria-label="Acceso a Banca en Línea"><div className="hero-visual"><Image src="/community-finance.jpeg" alt="Personas conversando sobre sus finanzas con una app bancaria" fill priority sizes="(max-width: 800px) 100vw, 58vw" /><div className="hero-overlay"><span className="eyebrow">RETO HACK MTY · BANORTE</span><h2>Tu banca, más cerca de ti.</h2><p>Conoce tus opciones, toma decisiones claras y conversa con Maya cuando lo necesites.</p></div></div><BanorteLogin /></section>
      <footer className="public-footer"><span>© 2026 Banorte. Prototipo académico.</span><span>Seguridad · Privacidad · Términos</span></footer>
    </main>
  )
}
