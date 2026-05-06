# UIAgent

## Responsibility
React (web) and React Native (iOS) components only.
Consumes data from LedgerAgent + ChartAgent via hooks. No business logic here.

## Component Tree
```
<App>
├── <DashboardHeader />          # account info, PSD2 badge
├── <TabBar />                   # Overview | Transactions | Charts
├── <OverviewTab>
│   ├── <KPIGrid />              # 6 metric cards
│   ├── <CashFlowTable />        # category rows + totals
│   ├── <AddEntryButton />       # opens modal
│   └── <BalanceChart />         # line chart (ChartAgent data)
├── <TransactionsTab>
│   ├── <MonthSelector />
│   ├── <AddEntryButton />
│   └── <TransactionList />      # tx rows + delete
└── <ChartsTab>
    ├── <CategoryDonut />
    ├── <IncomeExpenseBar />
    └── <BalanceTrendChart />
```
Modal lives outside the tree at root level (portal on web, Modal component on iOS).

## Hooks (data fetching — no logic)
```ts
// src/hooks/useSummary.ts
export function useSummary(month: string) {
  return useSWR(`/api/summary/${month}`, fetcher)
}

// src/hooks/useTransactions.ts
export function useTransactions(month: string) {
  return useSWR(`/api/transactions/${month}`, fetcher)
}

// src/hooks/useChartData.ts
export function useChartData(months: string[]) {
  // Fetches all summaries, passes to ChartAgent
  const summaries = useAllSummaries(months)
  return useMemo(() => new ChartAgent().getBalanceSeries(summaries), [summaries])
}
```

## Add Entry Form
```ts
interface EntryForm {
  type: 'income' | 'expense'
  name: string
  amount: string      // string for input; parse to number on submit
  date: string        // YYYY-MM-DD
  category: Category
  month: string       // YYYY-MM
}

// Validation (before POST to LedgerAgent)
function validate(f: EntryForm): string | null {
  if (!f.name.trim()) return 'Name required'
  if (!f.amount || isNaN(+f.amount) || +f.amount <= 0) return 'Valid amount required'
  return null
}
```

## iOS Rules (React Native)
- Use `<SafeAreaView>` root
- `<FlatList>` for transaction list (virtualized — not `ScrollView + map`)
- `<Modal>` from `react-native` for add entry — not a web-style overlay
- Touch targets min `44×44pt` (Apple HIG)
- Use `StyleSheet.create()` — no inline styles for perf
- Bottom tab bar via `@react-navigation/bottom-tabs`
- Charts: `victory-native` instead of Recharts
- Haptic feedback on save/delete: `expo-haptics`

## Web Rules
- Tailwind utility classes only — no custom CSS
- Recharts with `ResponsiveContainer` — never fixed pixel widths
- Modal via React Portal to `document.body`
- `table-layout: fixed` on cash flow table

## Shared (web + iOS)
- Format amounts: always `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`
- Never format in component — use `formatEur(amount: number): string` from `src/utils/format.ts`
- Category icons defined once in `src/constants/categories.ts`
- Colors consumed from `ChartAgent.CAT_COLORS` — never hardcoded in components

## File Structure
```
src/
├── agents/           # BankAgent, CategoryAgent, LedgerAgent, ChartAgent
├── components/
│   ├── web/          # Recharts, HTML table components
│   └── native/       # RN-specific components
├── hooks/            # useSummary, useTransactions, useChartData
├── utils/
│   └── format.ts     # formatEur, formatDate, formatMonth
└── constants/
    └── categories.ts  # CATEGORIES, CAT_ICONS, CAT_COLORS
```
