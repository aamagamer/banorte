import type { SupabaseClient } from '@supabase/supabase-js'
import type { UISchema } from '@/lib/components-registry/schema'
import type { SavedView, SavedViewInput } from './types'

// Capa de abstraccion pedida explicitamente: el resto de la app (API routes,
// UI) solo conoce esta interfaz, nunca Supabase directamente. Si en algun
// momento la persistencia cambia de motor, solo hay que escribir una nueva
// implementacion de SavedViewsRepository — nada mas se toca.
export interface SavedViewsRepository {
  list(): Promise<SavedView[]>
  create(input: SavedViewInput): Promise<SavedView>
  rename(id: string, name: string): Promise<SavedView>
  remove(id: string): Promise<void>
}

interface SavedViewRow {
  id: string
  user_id: string
  name: string
  category: string
  description: string | null
  prompt: string
  customer_id: string
  ui_schema: UISchema
  created_at: string
  updated_at: string
}

function toSavedView(row: SavedViewRow): SavedView {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    description: row.description,
    prompt: row.prompt,
    customerId: row.customer_id,
    uiSchema: row.ui_schema,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Implementacion respaldada por Supabase (supabase/schema-saved-views.sql).
// El cliente que se le pasa siempre lleva el JWT del usuario (ver
// lib/supabase/server.ts), asi que Row Level Security ya garantiza el
// aislamiento por usuario; los filtros .eq('user_id', ...) de aqui son una
// segunda capa de defensa explicita, no la unica.
export class SupabaseSavedViewsRepository implements SavedViewsRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list(): Promise<SavedView[]> {
    const { data, error } = await this.supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`No se pudieron cargar tus vistas guardadas: ${error.message}`)
    return ((data ?? []) as SavedViewRow[]).map(toSavedView)
  }

  async create(input: SavedViewInput): Promise<SavedView> {
    const { data, error } = await this.supabase
      .from('saved_views')
      .insert({
        user_id: this.userId,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        prompt: input.prompt,
        customer_id: input.customerId,
        ui_schema: input.uiSchema,
      })
      .select('*')
      .single()

    if (error) throw new Error(`No se pudo guardar la vista: ${error.message}`)
    return toSavedView(data as SavedViewRow)
  }

  async rename(id: string, name: string): Promise<SavedView> {
    const { data, error } = await this.supabase
      .from('saved_views')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', this.userId)
      .select('*')
      .single()

    if (error) throw new Error(`No se pudo renombrar la vista: ${error.message}`)
    return toSavedView(data as SavedViewRow)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('saved_views')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)

    if (error) throw new Error(`No se pudo eliminar la vista: ${error.message}`)
  }
}
