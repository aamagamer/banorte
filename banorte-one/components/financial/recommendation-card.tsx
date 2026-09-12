import { Lightbulb } from 'lucide-react'

interface RecommendationProps {
  title: string
  message: string
  disclaimer?: string
}

export function RecommendationCard({ props }: { props: RecommendationProps }) {
  return (
    <div className="fin-card recommendation-card">
      <div className="recommendation-icon"><Lightbulb aria-hidden="true" /></div>
      <div>
        <strong>{props.title}</strong>
        <p>{props.message}</p>
        <span className="recommendation-disclaimer">
          {props.disclaimer ?? 'Sugerencia generada por IA a partir de tus datos. No es asesoria financiera personalizada.'}
        </span>
      </div>
    </div>
  )
}
