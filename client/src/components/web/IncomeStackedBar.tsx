import { CategoryStackedBar } from './CategoryStackedBar'
import type { StackedDataset } from '../../types'

interface Props { data: StackedDataset }

export function IncomeStackedBar({ data }: Props) {
  return <CategoryStackedBar data={data} title="Income by Source" />
}
