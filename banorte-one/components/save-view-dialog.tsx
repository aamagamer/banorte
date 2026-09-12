'use client'

// Dialogo para "Guardar vista": guarda el UI Schema que YA generó el agente
// (nunca un screenshot, nunca solo el prompt) junto con metadatos minimos —
// ver lib/saved-views/types.ts y app/api/saved-views/route.ts. El schema en
// si nunca se pide aqui: lo maneja banking-shell.tsx, que ya lo tiene en
// estado (uiSchema).

import { useEffect, useState, type FormEvent } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Bookmark, X } from 'lucide-react'

export interface SaveViewFormInput {
  name: string
  category: string
  description: string
}

export function SaveViewDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: SaveViewFormInput) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setCategory('')
      setDescription('')
      setError('')
    }
  }, [open])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Ponle un nombre a tu vista.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: trimmedName, category: category.trim() || 'General', description: description.trim() })
    } catch (err) {
      setError((err as Error).message || 'No pudimos guardar tu vista.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup className="modal-popup save-view-popup">
          <div className="modal-head">
            <Dialog.Title className="modal-title">Guardar vista</Dialog.Title>
            <Dialog.Close type="button" className="modal-close" aria-label="Cerrar">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <p className="modal-subtitle">
            Vas a guardar exactamente la interfaz que Maya armó para ti. Podrás reabrirla despues desde &ldquo;Mis
            vistas&rdquo; sin volver a pedirle nada.
          </p>
          <form className="modal-form" onSubmit={handleSubmit}>
            <label htmlFor="save-view-name">Nombre de la vista</label>
            <input
              id="save-view-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Viaje a Estados Unidos"
              autoFocus
              maxLength={120}
            />

            <label htmlFor="save-view-category">Categoría</label>
            <input
              id="save-view-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Viajes"
              maxLength={60}
            />

            <label htmlFor="save-view-description">Descripción (opcional)</label>
            <textarea
              id="save-view-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Vista personalizada para mi viaje"
              rows={2}
              maxLength={280}
            />

            {error && <p className="modal-error" role="alert">{error}</p>}

            <div className="modal-actions">
              <Dialog.Close type="button" className="modal-cancel">Cancelar</Dialog.Close>
              <button type="submit" className="modal-submit" disabled={saving}>
                <Bookmark aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
