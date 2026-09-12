import { AlertTriangle, Info, OctagonAlert } from 'lucide-react'

interface AlertProps {
  severity?: 'info' | 'warning' | 'critical'
  title: string
  message: string
}

const ICONS = { info: Info, warning: AlertTriangle, critical: OctagonAlert }

export function AlertCard({ props }: { props: AlertProps }) {
  const severity = props?.severity ?? 'info'
  const Icon = ICONS[severity]
  return (
    <div className={`fin-card alert-card severity-${severity}`}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{props.title}</strong>
        <p>{props.message}</p>
      </div>
    </div>
  )
}
