import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useSummary } from '../hooks/useSummary'
import { useBalanceSeries } from '../hooks/useChartData'
import { prevMonths } from '../utils/format'
import { KPIGrid } from '../components/web/KPIGrid'
import { CashFlowTable } from '../components/web/CashFlowTable'
import { BalanceChart } from '../components/web/BalanceChart'
import { AddEntryModal } from '../components/web/AddEntryModal'

interface Props { month: string }

export function OverviewTab({ month }: Props) {
  const [modal, setModal] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: summary, isLoading } = useSummary(month)
  const months = prevMonths(6, month)
  const { data: series } = useBalanceSeries(months)

  function onSaved() { mutate(`/api/summary/${month}`) }

  if (isLoading || !summary) return <div className="p-6 text-sm text-gray-400">Loading…</div>

  return (
    <div className="p-6 space-y-4">
      <KPIGrid summary={summary} />
      <CashFlowTable summary={summary} />
      {series && <BalanceChart data={series} />}
      <button
        onClick={() => setModal(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full w-12 h-12 text-2xl shadow-lg hover:bg-blue-700 flex items-center justify-center"
      >+</button>
      {modal && <AddEntryModal month={month} onClose={() => setModal(false)} onSaved={onSaved} />}
    </div>
  )
}
