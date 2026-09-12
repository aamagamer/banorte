// Adapter: Banco de Mexico (Banxico) SIE API — fuente oficial mexicana de
// tipo de cambio e inflacion (ver docs/ARCHITECTURE.md / brief seccion 15,
// "External Financial Data Adapter", y seccion 14, "Production Adapter").
//
// Requiere BANXICO_SIE_TOKEN (gratuito, se solicita en
// https://www.banxico.org.mx/SieAPIRest/service/v1/token). Si el token no
// esta configurado, o la llamada falla (red, token vencido, limite de
// consultas), quien use este adapter debe capturar el error y caer a un
// valor demo — nunca debe tumbar la vista en vivo frente al jurado.
//
// Series usadas (catalogo publico de Banxico):
// - SF43718: tipo de cambio FIX peso/dolar.
// - SP1: INPC (Indice Nacional de Precios al Consumidor), nivel mensual.
// - SF60648: TIIE a 28 dias.

const BANXICO_BASE = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series'

interface BanxicoDato {
  fecha: string
  dato: string
}

interface BanxicoResponse {
  bmx: { series: { idSerie: string; datos?: BanxicoDato[] }[] }
}

async function fetchBanxicoSeries(seriesId: string, range: 'oportuno' | { start: string; end: string }): Promise<BanxicoDato[]> {
  const token = process.env.BANXICO_SIE_TOKEN
  if (!token) throw new Error('BANXICO_SIE_TOKEN no esta configurado')

  const suffix = range === 'oportuno' ? 'oportuno' : `${range.start}/${range.end}`
  const url = `${BANXICO_BASE}/${seriesId}/datos/${suffix}?token=${encodeURIComponent(token)}`

  const response = await fetch(url, {
    // Banxico documenta el token tanto por query param como por header
    // Bmx-Token; mandamos ambos para maximizar compatibilidad.
    headers: { 'Bmx-Token': token, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Banxico SIE respondio ${response.status} para la serie ${seriesId}`)
  }
  const json = (await response.json()) as BanxicoResponse
  const serie = json.bmx?.series?.[0]
  if (!serie?.datos?.length) {
    throw new Error(`Banxico SIE no regreso datos para la serie ${seriesId}`)
  }
  return serie.datos
}

function parseNumeric(dato: BanxicoDato): number {
  return Number(dato.dato.replace(/,/g, ''))
}

function formatBanxicoDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${date.getFullYear()}`
}

export async function getUsdMxnFix(): Promise<{ rate: number; date: string }> {
  const datos = await fetchBanxicoSeries('SF43718', 'oportuno')
  const last = datos[datos.length - 1]
  const rate = parseNumeric(last)
  if (Number.isNaN(rate)) throw new Error('Banxico SIE regreso un tipo de cambio no numerico')
  return { rate, date: last.fecha }
}

export async function getTiie28(): Promise<{ rate: number; date: string }> {
  const datos = await fetchBanxicoSeries('SF60648', 'oportuno')
  const last = datos[datos.length - 1]
  const rate = parseNumeric(last)
  if (Number.isNaN(rate)) throw new Error('Banxico SIE regreso una TIIE no numerica')
  return { rate, date: last.fecha }
}

// El INPC es mensual y Banxico no siempre expone una serie separada ya
// calculada de "variacion % anual", asi que pedimos ~14 meses de historial
// del nivel (SP1) y calculamos la inflacion anual igual que la metodologia
// oficial: INPC del mes actual vs INPC del mismo mes del año anterior.
export async function getInpcAnnualInflation(): Promise<{ annualRate: number; asOf: string }> {
  const today = new Date()
  const start = new Date(today)
  start.setMonth(start.getMonth() - 14)

  const datos = await fetchBanxicoSeries('SP1', { start: formatBanxicoDate(start), end: formatBanxicoDate(today) })
  const numeric = datos
    .map((d) => ({ fecha: d.fecha, valor: parseNumeric(d) }))
    .filter((d) => !Number.isNaN(d.valor))

  if (numeric.length < 13) {
    throw new Error('Banxico SIE no regreso suficiente historial de INPC para calcular la inflacion anual')
  }

  const latest = numeric[numeric.length - 1]
  const yearAgo = numeric[numeric.length - 13]
  const annualRate = (latest.valor / yearAgo.valor - 1) * 100

  return { annualRate: Math.round(annualRate * 10) / 10, asOf: latest.fecha }
}
