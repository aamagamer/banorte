import { Sparkles } from 'lucide-react'

export function SituationBanner({ props }: { props: { label?: string; explanation?: string } }) {
  if (!props?.label) return null
  return (
    <div className="fin-card situation-banner">
      <div className="situation-banner-icon"><Sparkles aria-hidden="true" /></div>
      <div>
        <span className="situation-banner-label">MODO {props.label.toUpperCase()}</span>
        <p>{props.explanation}</p>
      </div>
    </div>
  )
}
