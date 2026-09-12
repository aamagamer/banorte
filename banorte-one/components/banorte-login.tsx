'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function BanorteLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setIsLoading(false)

    if (error) {
      setMessage('No pudimos validar tus datos. Revisa tu correo y contraseña.')
      return
    }

    router.push('/banca')
    router.refresh()
  }

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-intro">
        <span className="eyebrow">BANCA EN LÍNEA</span>
        <h1 id="login-title">Tu banca, más simple.</h1>
        <p>Consulta tus productos y empieza a conversar con tu asistente financiero.</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" />

        <label htmlFor="password">Contraseña</label>
        <div className="password-field">
          <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Escribe tu contraseña" />
          <button type="button" className="icon-button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>

        {message && <p className="form-error" role="alert">{message}</p>}
        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Validando...' : 'Entrar'}
          {!isLoading && <ArrowRight aria-hidden="true" />}
        </button>
        <a className="text-link" href="#ayuda">¿Olvidaste tu contraseña?</a>
      </form>

      <div className="login-security"><LockKeyhole aria-hidden="true" /><span>Tu información viaja protegida</span><ShieldCheck aria-hidden="true" /></div>
    </section>
  )
}
