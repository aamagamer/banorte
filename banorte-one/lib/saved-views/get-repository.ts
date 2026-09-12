import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SupabaseSavedViewsRepository, type SavedViewsRepository } from './repository'

export type RepositoryResolution = { ok: true; repo: SavedViewsRepository } | { ok: false; status: number; error: string }

// Resuelve el repositorio de vistas guardadas PARA EL USUARIO AUTENTICADO de
// la request actual (via cookies de Supabase) — nunca acepta un userId que
// venga del cliente. Si no hay sesion valida, ninguna API route de vistas
// guardadas continua.
export async function getSavedViewsRepositoryForRequest(): Promise<RepositoryResolution> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Debes iniciar sesión para usar tus vistas guardadas.' }
  }

  return { ok: true, repo: new SupabaseSavedViewsRepository(supabase, data.user.id) }
}
