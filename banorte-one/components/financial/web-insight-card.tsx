import { ExternalLink, Globe } from 'lucide-react'

interface WebInsightItem {
  title: string
  summary: string
  sourceTitle?: string
  sourceUrl?: string
}

interface WebInsightProps {
  title?: string
  items?: WebInsightItem[]
}

// Tarjeta para recomendaciones que el agente obtuvo con la tool de busqueda
// web (modo LIVE, ver lib/agent/llm-orchestrator.ts). A diferencia de
// RecommendationCard (que resume los datos propios del cliente), esta
// tarjeta siempre debe traer una fuente real citada — nunca datos inventados.
export function WebInsightCard({ props }: { props: WebInsightProps }) {
  const items = props?.items ?? []
  return (
    <div className="fin-card web-insight-card">
      <div className="web-insight-header">
        <Globe aria-hidden="true" />
        <span className="fin-card-label">{props?.title ?? 'Recomendaciones en tiempo real'}</span>
      </div>
      {items.length === 0 ? (
        <p className="chart-empty">No encontramos recomendaciones para esta situacion.</p>
      ) : (
        <ul className="web-insight-list">
          {items.map((item, index) => (
            <li key={index}>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener" className="web-insight-source">
                  <ExternalLink aria-hidden="true" />
                  {item.sourceTitle ?? item.sourceUrl}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      <span className="recommendation-disclaimer">Resultados de busqueda web en tiempo real. Verifica antes de tomar una decision financiera.</span>
    </div>
  )
}
