import type { UISchema } from '@/lib/components-registry/schema'

// Una "vista guardada" es el UI Schema declarativo que YA produce el agente
// (nunca un screenshot, nunca solo el prompt) mas los metadatos minimos para
// listarla y reabrirla sin volver a llamar a Claude. Ver
// docs/MCP.md y lib/saved-views/repository.ts.
export interface SavedView {
  id: string
  userId: string
  name: string
  category: string
  description: string | null
  prompt: string
  // Persona demo (lib/demo-data/customers.ts) activa cuando se guardo la
  // vista. Varios componentes leen datos en vivo del customer actual además
  // de sus props (ver lib/components-registry/registry.tsx), asi que al
  // reabrir la vista hay que volver a seleccionar esta misma persona para
  // reproducirla tal cual.
  customerId: string
  uiSchema: UISchema
  createdAt: string
  updatedAt: string
}

export interface SavedViewInput {
  name: string
  category: string
  description?: string | null
  prompt: string
  customerId: string
  uiSchema: UISchema
}
