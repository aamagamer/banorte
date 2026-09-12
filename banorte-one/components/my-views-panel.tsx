'use client'

// "Mis vistas" / "Experiencias guardadas". Lista las vistas guardadas del
// usuario (ver app/api/saved-views/route.ts) y permite abrir/renombrar/
// eliminar cada una. Abrir una vista SOLO renderiza su ui_schema guardado —
// nunca vuelve a llamar a Claude (eso lo hace banking-shell.tsx via
// onOpenView).

import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Menu } from '@base-ui/react/menu'
import { Check, MoreVertical, Pencil, Trash2, X } from 'lucide-react'
import type { SavedView } from '@/lib/saved-views/types'

const CATEGORY_ICON: Record<string, string> = {
  viajes: '✈️',
  viaje: '✈️',
  ahorro: '🎯',
  ahorros: '🎯',
  compras: '💳',
  negocio: '📊',
  inversion: '📈',
  inversiones: '📈',
  general: '⭐',
}

function iconFor(category: string) {
  return CATEGORY_ICON[category.trim().toLowerCase()] ?? '⭐'
}

export function MyViewsPanel({
  open,
  onOpenChange,
  views,
  loading,
  error,
  onOpenView,
  onRename,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  views: SavedView[]
  loading: boolean
  error: string
  onOpenView: (view: SavedView) => void
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!open) {
      setRenamingId(null)
      setConfirmDeleteId(null)
      setActionError('')
    }
  }, [open])

  async function submitRename(id: string) {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setBusyId(id)
    setActionError('')
    try {
      await onRename(id, trimmed)
      setRenamingId(null)
    } catch (err) {
      setActionError((err as Error).message || 'No se pudo renombrar la vista.')
    } finally {
      setBusyId(null)
    }
  }

  async function runDelete(id: string) {
    setBusyId(id)
    setActionError('')
    try {
      await onDelete(id)
      setConfirmDeleteId(null)
    } catch (err) {
      setActionError((err as Error).message || 'No se pudo eliminar la vista.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup className="modal-popup my-views-popup">
          <div className="modal-head">
            <Dialog.Title className="modal-title">Mis vistas</Dialog.Title>
            <Dialog.Close type="button" className="modal-close" aria-label="Cerrar">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <p className="modal-subtitle">
            Experiencias que guardaste. Al abrir una se renderiza tal cual, sin volver a pedirle nada a Maya.
          </p>

          {actionError && <p className="modal-error" role="alert">{actionError}</p>}

          {loading ? (
            <p className="my-views-status">Cargando tus vistas…</p>
          ) : error ? (
            <p className="my-views-status my-views-error">{error}</p>
          ) : views.length === 0 ? (
            <p className="my-views-status">
              Aún no has guardado ninguna vista. Genera una interfaz con Maya y usa &ldquo;Guardar vista&rdquo; para
              verla aquí.
            </p>
          ) : (
            <ul className="my-views-list">
              {views.map((view) => (
                <li key={view.id} className="my-views-row">
                  {renamingId === view.id ? (
                    <form
                      className="my-views-rename-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        submitRename(view.id)
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        autoFocus
                        maxLength={120}
                        aria-label="Nuevo nombre de la vista"
                      />
                      <button type="submit" className="my-views-icon-btn" disabled={busyId === view.id} aria-label="Guardar nombre">
                        <Check aria-hidden="true" />
                      </button>
                      <button type="button" className="my-views-icon-btn" onClick={() => setRenamingId(null)} aria-label="Cancelar renombrar">
                        <X aria-hidden="true" />
                      </button>
                    </form>
                  ) : confirmDeleteId === view.id ? (
                    <div className="my-views-confirm-delete">
                      <span>¿Eliminar &ldquo;{view.name}&rdquo;?</span>
                      <button type="button" className="my-views-danger-btn" onClick={() => runDelete(view.id)} disabled={busyId === view.id}>
                        Eliminar
                      </button>
                      <button type="button" className="my-views-cancel-btn" onClick={() => setConfirmDeleteId(null)}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button type="button" className="my-views-open" onClick={() => onOpenView(view)}>
                        <span className="my-views-icon" aria-hidden="true">{iconFor(view.category)}</span>
                        <span className="my-views-copy">
                          <strong>{view.name}</strong>
                          <span>{view.description || view.category}</span>
                        </span>
                      </button>

                      <Menu.Root>
                        <Menu.Trigger className="my-views-icon-btn" aria-label={`Más acciones para ${view.name}`}>
                          <MoreVertical aria-hidden="true" />
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Positioner side="bottom" align="end" sideOffset={4} className="menu-positioner">
                            <Menu.Popup className="menu-popup">
                              <Menu.Item className="menu-item" onClick={() => onOpenView(view)}>
                                Abrir
                              </Menu.Item>
                              <Menu.Item
                                className="menu-item"
                                onClick={() => {
                                  setRenamingId(view.id)
                                  setRenameValue(view.name)
                                }}
                              >
                                <Pencil aria-hidden="true" /> Renombrar
                              </Menu.Item>
                              <Menu.Item className="menu-item menu-item-danger" onClick={() => setConfirmDeleteId(view.id)}>
                                <Trash2 aria-hidden="true" /> Eliminar
                              </Menu.Item>
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
