const eurFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export const formatEur = (cents: number) => eurFmt.format(cents / 100)
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
export const formatMonth = (ym: string) => {
  const [year, month] = ym.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}
export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function prevMonths(n: number, from = currentMonth()): string[] {
  const [y, m] = from.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function formatEurCompact(cents: number): string {
  const euros = cents / 100
  if (Math.abs(euros) >= 1000) return `${(euros / 1000).toFixed(1)}k€`
  return `${euros.toFixed(0)}€`
}

export function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
