'use client'

// Barra flotente por tarjeta en "modo personalizar" (ver banking-shell.tsx).
// Solo escribe sobre el uiSchema que ya esta en memoria — nunca vuelve a
// llamar al agente. Esto es deliberado: es la contraparte del lado del
// cliente de lo que un protocolo como A2UI/AG-UI resuelve del lado del
// agente (ver docs/ARCHITECTURE.md, seccion "Personalizacion de la vista").

import { ArrowDown, ArrowUp, Maximize2, Minimize2, X } from 'lucide-react'

export function ComponentToolbar({
  canMoveUp,
  canMoveDown,
  isExpanded,
  onMoveUp,
  onMoveDown,
  onToggleSize,
  onHide,
  label,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  isExpanded: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onToggleSize: () => void
  onHide: () => void
  label: string
}) {
  return (
    <div className="component-toolbar" role="toolbar" aria-label={`Personalizar ${label}`}>
      <button type="button" onClick={onMoveUp} disabled={!canMoveUp} aria-label={`Subir ${label}`} title="Subir">
        <ArrowUp aria-hidden="true" />
      </button>
      <button type="button" onClick={onMoveDown} disabled={!canMoveDown} aria-label={`Bajar ${label}`} title="Bajar">
        <ArrowDown aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleSize}
        aria-label={isExpanded ? `Achicar ${label}` : `Agrandar ${label}`}
        title={isExpanded ? 'Achicar' : 'Agrandar'}
      >
        {isExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
      </button>
      <button type="button" onClick={onHide} className="is-danger" aria-label={`Quitar ${label} de la vista`} title="Quitar de la vista">
        <X aria-hidden="true" />
      </button>
    </div>
  )
}