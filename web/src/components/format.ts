export function money(v: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}
export function pct(v: number) {
  return `${v.toFixed(1)}%`;
}
export function formatValue(v: number, format?: "currency" | "percent" | "number") {
  if (format === "percent") return pct(v);
  if (format === "number") return new Intl.NumberFormat("es-MX").format(v);
  return money(v);
}
const CATEGORY_LABELS: Record<string, string> = {
  food: "Comida",
  transport: "Transporte",
  tuition: "Colegiatura",
  scholarship_income: "Beca",
  housing: "Renta",
  entertainment: "Entretenimiento",
  health: "Salud",
  utilities: "Servicios",
  shopping: "Compras",
  business_revenue: "Ventas",
  business_supplies: "Insumos",
  business_payroll: "Nómina",
  business_marketing: "Marketing",
  business_services: "Renta / servicios",
  owner_draw: "Retiro del negocio",
  savings_transfer: "Transferencia a ahorro",
  investment: "Inversión",
  other: "Otros",
};
export function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat;
}
export function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  const labels = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${labels[Number(m) - 1]} ${y.slice(2)}`;
}
