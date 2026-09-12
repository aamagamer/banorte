interface ExchangeRateProps {
  from: string
  to: string
  rate: number
}

export function ExchangeRateCard({ props }: { props: ExchangeRateProps }) {
  return (
    <div className="fin-card exchange-rate-card">
      <span className="fin-card-label">Tipo de cambio</span>
      <strong>
        {props.from}/{props.to} {props.rate.toFixed(2)}
      </strong>
      <p className="fin-card-help">Actualizado para tu viaje. Fuente: modo demo.</p>
    </div>
  )
}
