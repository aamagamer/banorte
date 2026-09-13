'use client'

// "Ocultos": los componentes que el usuario quito de su vista con el boton
// ✕ del ComponentToolbar siguen viviendo en uiSchema.components (con
// hidden: true) — nunca se borran del schema, asi que reaparecen tal cual
// (mismos datos, misma posicion relativa) con un clic. Esto es justo lo que
// se pidio: "que pueda quitar un componente pero que no se borre toda la
// vista".

import { Eye } from 'lucide-react'
import type { ComponentSpec } from '@/lib/components-registry/schema'
import { COMPONENT_LABELS } from '@/lib/components-registry/labels'

export function HiddenTray({ hidden, onRestore }: { hidden: ComponentSpec[]; onRestore: (id: string) => void }) {
  if (hidden.length === 0) return null

  return (
    <div className="hidden-tray">
      <span className="hidden-tray-label">Ocultos:</span>
      {hidden.map((spec) => (
        <button key={spec.id} type="button" className="hidden-chip" onClick={() => onRestore(spec.id)}>
          <Eye aria-hidden="true" /> {COMPONENT_LABELS[spec.type] ?? spec.type}
        </button>
      ))}
    </div>
  )
}