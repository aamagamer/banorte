// Adapter: Frankfurter (frankfurter.dev) — API de tipo de cambio gratuita y
// sin API key (datos del Banco Central Europeo). Se usa como respaldo:
// - cuando Banxico falla o no hay BANXICO_SIE_TOKEN configurado, o
// - para pares de moneda que no son USD-MXN (ej. EUR, JPY, GBP), que Banxico
//   tambien publica pero para las que este prototipo no mapeo series todavia.
//
// Ver docs de arquitectura, "External Financial Data Adapter" (brief seccion 15):
// el agente nunca debe depender de una sola fuente.

export async function getFrankfurterRate(from: string, to: string): Promise<{ rate: number; date: string }> {
  const url = `https://api.frankfurter.dev/v2/rate/${from.toLowerCase()}/${to.toLowerCase()}`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Frankfurter respondio ${response.status} para ${from}->${to}`)
  }
  const json = (await response.json()) as { date?: string; rate?: number; rates?: Record<string, number> }

  const rate =
    typeof json.rate === 'number'
      ? json.rate
      : json.rates?.[to.toUpperCase()] ?? (json.rates ? Object.values(json.rates)[0] : undefined)

  if (typeof rate !== 'number' || Number.isNaN(rate)) {
    throw new Error(`Frankfurter no regreso una tasa valida para ${from}->${to}`)
  }

  return { rate, date: json.date ?? new Date().toISOString().slice(0, 10) }
}
