import { ALLOWED_COMPONENT_TYPES } from '@/lib/mcp/tools'

export type ComponentType = (typeof ALLOWED_COMPONENT_TYPES)[number]

export interface ComponentSpec {
  type: ComponentType
  id: string
  priority: number
  props: Record<string, unknown>
}

export interface UISchema {
  situation: string | null
  title: string
  explanation: string
  components: ComponentSpec[]
  nextBestActions: { label: string; action: string }[]
}

const ALLOWED_SET = new Set<string>(ALLOWED_COMPONENT_TYPES)

// El agente/orquestador construye un UISchema "candidato". Antes de que React
// lo renderice, se valida aqui: se descarta cualquier componente cuyo type no
// este en el catalogo autorizado y se ordena por priority. Esto es lo que
// impide que el modelo "invente" componentes arbitrarios (seccion 9 y 16 del
// brief: "el LLM no debe generar JSX arbitrario").
export function validateUISchema(candidate: UISchema): UISchema {
  const safeComponents = (candidate.components ?? [])
    .filter((component): component is ComponentSpec => {
      if (!component || typeof component.type !== 'string') return false
      if (!ALLOWED_SET.has(component.type)) {
        console.warn(`[ui-schema] componente rechazado por no estar en el catalogo: ${component.type}`)
        return false
      }
      return true
    })
    .sort((a, b) => a.priority - b.priority)

  return {
    situation: candidate.situation ?? null,
    title: candidate.title || 'Tu banca',
    explanation: candidate.explanation || '',
    components: safeComponents,
    nextBestActions: candidate.nextBestActions ?? [],
  }
}

// UI base de respaldo si el agente o el MCP fallan (seccion 26 del brief:
// "el sistema debe funcionar incluso si el LLM/MCP falla").
export function fallbackUISchema(): UISchema {
  return {
    situation: null,
    title: 'Resumen',
    explanation: 'No pudimos generar una vista personalizada en este momento, aqui tienes tu resumen general.',
    components: [
      { type: 'account_card', id: 'fallback-accounts', priority: 1, props: {} },
      { type: 'transaction_list', id: 'fallback-transactions', priority: 2, props: {} },
    ],
    nextBestActions: [],
  }
}
