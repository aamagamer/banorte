import { NextResponse } from 'next/server'
import { getSavedViewsRepositoryForRequest } from '@/lib/saved-views/get-repository'
import { validateUISchema } from '@/lib/components-registry/schema'
import { DEMO_CUSTOMERS } from '@/lib/demo-data/customers'

// Vistas guardadas del usuario autenticado. Nunca recibe ni usa un userId que
// venga del body — siempre se resuelve del lado del servidor a partir de la
// sesion de Supabase (ver lib/saved-views/get-repository.ts), asi que un
// usuario no puede leer ni crear vistas a nombre de otro.

export async function GET() {
  const resolution = await getSavedViewsRepositoryForRequest()
  if (!resolution.ok) return NextResponse.json({ error: resolution.error }, { status: resolution.status })

  try {
    const views = await resolution.repo.list()
    return NextResponse.json({ views })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const resolution = await getSavedViewsRepositoryForRequest()
  if (!resolution.ok) return NextResponse.json({ error: resolution.error }, { status: resolution.status })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim().slice(0, 60) : 'General'
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 280) : null
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 2000) : ''
  const customerId = typeof body?.customerId === 'string' && body.customerId in DEMO_CUSTOMERS ? body.customerId : null

  if (!name) return NextResponse.json({ error: 'El nombre de la vista es requerido.' }, { status: 400 })
  if (!customerId) return NextResponse.json({ error: 'customerId invalido.' }, { status: 400 })
  if (!body?.uiSchema) return NextResponse.json({ error: 'uiSchema es requerido.' }, { status: 400 })

  // Nunca confiamos en el ui_schema tal cual llega del cliente: se vuelve a
  // pasar por el mismo validador que usa el orquestador, que descarta
  // cualquier componente fuera del catalogo cerrado (lib/components-registry/schema.ts).
  const uiSchema = validateUISchema(body.uiSchema)

  try {
    const view = await resolution.repo.create({ name, category, description, prompt, customerId, uiSchema })
    return NextResponse.json({ view }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
