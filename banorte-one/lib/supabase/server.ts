import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Cliente de Supabase para Route Handlers y Server Components — mismo patron
// que ya usa app/banca/page.tsx. Siempre lleva el JWT del usuario (nunca la
// service role key), asi que Row Level Security aplica en cada consulta: un
// usuario nunca puede leer ni escribir filas de otro usuario, ni aunque el
// codigo del endpoint tenga un bug (ver docs de seguridad del proyecto).
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Puede fallar si se llama desde un contexto de solo lectura de
            // cookies; es seguro ignorarlo, solo afecta el refresh silencioso
            // de la sesion, no la identidad del usuario que ya se resolvio.
          }
        },
      },
    },
  )
}
