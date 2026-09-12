'use client'

// Animacion de carga "premium" mientras Maya construye la interfaz. Sustituye
// al skeleton generico: en vez de un spinner, muestra el logo de Banorte
// (ya existente en /public, no se genera ni recrea aqui) rodeado de muchos
// fragmentos/minibloques diminutos que orbitan, aparecen y desaparecen —
// transmitiendo que la interfaz se esta "ensamblando" en tiempo real.
//
// Dos fases, controladas por el padre (banking-shell.tsx):
// - "building": mientras se espera la respuesta del agente. Loop infinito.
// - "converging": la respuesta ya llego. Los fragmentos se concentran hacia
//   el logo y se desvanecen (ver .is-converging en globals.css) antes de que
//   el padre desmonte este componente y muestre la grilla real.
//
// Respeta prefers-reduced-motion (ver la media query correspondiente en
// globals.css, que apaga las animaciones de los fragmentos).

import Image from 'next/image'
import { useMemo, type CSSProperties } from 'react'

type Tone = 'ink' | 'soft' | 'red'

interface Fragment {
  id: number
  angle: number
  radius: number
  size: number
  isChip: boolean
  orbitDuration: number
  orbitDelay: number
  pulseDuration: number
  pulseDelay: number
  reverse: boolean
  tone: Tone
  peak: number
}

const TONE_CYCLE: { tone: Tone; peak: number }[] = [
  { tone: 'ink', peak: 0.42 },
  { tone: 'soft', peak: 0.34 },
  { tone: 'soft', peak: 0.3 },
  { tone: 'ink', peak: 0.4 },
  { tone: 'red', peak: 0.85 },
  { tone: 'soft', peak: 0.32 },
]

// Generacion determinista (no Math.random) para que el patron sea estable
// mientras el componente esta montado, usando el angulo dorado para repartir
// los fragmentos de forma pareja alrededor del logo.
function buildFragments(count: number): Fragment[] {
  const fragments: Fragment[] = []
  for (let i = 0; i < count; i++) {
    const ring = i % 4
    const jitter = (i * 53) % 11
    const { tone, peak } = TONE_CYCLE[i % TONE_CYCLE.length]
    fragments.push({
      id: i,
      angle: (i * 137.508) % 360,
      radius: 62 + ring * 33 + jitter,
      size: 3 + (i % 4),
      isChip: i % 3 === 0,
      orbitDuration: 7 + (i % 6) * 1.6 + ring * 0.7,
      orbitDelay: (i * 0.17) % 3,
      pulseDuration: 2.4 + (i % 5) * 0.55,
      pulseDelay: (i * 0.23) % 3.4,
      reverse: i % 2 === 0,
      tone,
      peak,
    })
  }
  return fragments
}

export function BanorteGenerating({ phase }: { phase: 'building' | 'converging' }) {
  const fragments = useMemo(() => buildFragments(46), [])

  return (
    <div className={`banorte-generating${phase === 'converging' ? ' is-converging' : ''}`} role="status" aria-live="polite">
      <span className="sr-only">Maya esta construyendo tu vista personalizada.</span>
      <div className="generating-stage" aria-hidden="true">
        <div className="fragment-field">
          {fragments.map((fragment) => (
            <div
              key={fragment.id}
              className={`fragment-pivot${fragment.reverse ? ' is-reverse' : ''}`}
              style={{
                '--angle': `${fragment.angle}deg`,
                '--orbit-duration': `${fragment.orbitDuration}s`,
                '--orbit-delay': `${fragment.orbitDelay}s`,
              } as CSSProperties}
            >
              <span
                className={`fragment-dot tone-${fragment.tone}${fragment.isChip ? ' is-chip' : ''}`}
                style={{
                  '--radius': `${fragment.radius}px`,
                  '--size': `${fragment.size}px`,
                  '--pulse-duration': `${fragment.pulseDuration}s`,
                  '--pulse-delay': `${fragment.pulseDelay}s`,
                  '--peak': fragment.peak,
                } as CSSProperties}
              />
            </div>
          ))}
        </div>
        <div className="core-plate">
          <Image src="/banorte-lockup.png" alt="" aria-hidden="true" width={108} height={32} priority />
        </div>
      </div>
    </div>
  )
}
