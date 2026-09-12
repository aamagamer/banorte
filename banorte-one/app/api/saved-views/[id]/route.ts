import { NextResponse } from 'next/server'
import { getSavedViewsRepositoryForRequest } from '@/lib/saved-views/get-repository'

// Renombrar/eliminar una vista guardada especifica. El repositorio (Supabase
// + Row Level Security) ya filtra por el usuario autenticado en cada
// operacion, asi que intentar renombrar/eliminar el id de otro usuario
// simplemente no encuentra la fila — nunca se toca.

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolution = await getSavedViewsRepositoryForRequest()
  if (!resolution.ok) return NextResponse.json({ error: resolution.error }, { status: resolution.status })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : ''
  if (!name) return NextResponse.json({ error: 'El nombre de la vista es requerido.' }, { status: 400 })

  try {
    const view = await resolution.repo.rename(id, name)
    return NextResponse.json({ view })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolution = await getSavedViewsRepositoryForRequest()
  if (!resolution.ok) return NextResponse.json({ error: resolution.error }, { status: resolution.status })

  const { id } = await params

  try {
    await resolution.repo.remove(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
