'use client'

import { useState } from 'react'
import { Lock, Unlock } from 'lucide-react'
import type { Customer } from '@/lib/demo-data/customers'

export function CardControls({ customer, props }: { customer: Customer; props: { context?: 'personal' | 'business' } }) {
  const initialCards = customer.cards.filter((c) => !props?.context || c.context === props.context)
  const [cards, setCards] = useState(initialCards)

  function toggle(id: string) {
    setCards((current) => current.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c)))
  }

  return (
    <div className="fin-card card-controls">
      <span className="fin-card-label">Control de tarjetas</span>
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <div>
              <strong>{card.label}</strong>
              <span>**** {card.last4}</span>
            </div>
            <button type="button" className={card.locked ? 'card-toggle locked' : 'card-toggle'} onClick={() => toggle(card.id)}>
              {card.locked ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}
              {card.locked ? 'Bloqueada' : 'Bloquear'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
