import { useState } from 'react'
import { useFoods, useMealLogs, useShoppingList } from '../hooks/useMeal'
import type { Food, MealItem, MealType } from '../hooks/useMeal'
import { ConfirmDialog } from '../components/web/ConfirmDialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { id: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { id: 'snack',     label: 'Snack',     icon: '🍎' },
]

const CATEGORIES = ['protein', 'carbs', 'fat', 'vegetable', 'fruit', 'dairy', 'other']

// ─── Today view ───────────────────────────────────────────────────────────────

function TodayView() {
  const date = todayStr()
  const { logs, saveMeal } = useMealLogs(date)
  const { foods } = useFoods()
  const [picking, setPicking] = useState<{ mealType: MealType; search: string } | null>(null)
  const [amounts, setAmounts] = useState<Record<number, string>>({})

  const calTarget = Number(localStorage.getItem('fd:calorie_target') ?? 2000)
  const totalCals = logs.reduce((sum, log) => sum + log.items.reduce((s, i) => s + i.calories, 0), 0)
  const pct = Math.min(100, Math.round((totalCals / calTarget) * 100))

  function getMealItems(mealType: MealType): MealItem[] {
    return logs.find(l => l.meal_type === mealType)?.items ?? []
  }

  async function addItem(mealType: MealType, food: Food) {
    const g = Number(amounts[food.id] ?? 100)
    const calories = Math.round((food.calories_per_100g * g) / 100)
    const existing = getMealItems(mealType)
    await saveMeal(mealType, [
      ...existing,
      { food_id: food.id, name: food.name, emoji: food.emoji, amount_g: g, calories },
    ])
    setPicking(null)
    setAmounts({})
  }

  async function removeItem(mealType: MealType, index: number) {
    const existing = getMealItems(mealType)
    await saveMeal(mealType, existing.filter((_, i) => i !== index))
  }

  const filtered = picking
    ? foods.filter(f => f.name.toLowerCase().includes(picking.search.toLowerCase()))
    : []

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Daily total */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-800">Daily calories</p>
          <p className="text-sm font-bold text-gray-900">{totalCals} <span className="text-gray-400 font-normal">/ {calTarget} kcal</span></p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : 'bg-xero-green'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Meal cards */}
      {MEAL_TYPES.map(({ id, label, icon }) => {
        const items = getMealItems(id)
        const mealCals = items.reduce((s, i) => s + i.calories, 0)
        return (
          <div key={id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <span>{icon}</span>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                {mealCals > 0 && <span className="text-xs text-gray-400">{mealCals} kcal</span>}
              </div>
              <button
                onClick={() => setPicking({ mealType: id, search: '' })}
                className="text-xs bg-xero-green text-white px-2.5 py-1 rounded-lg font-medium hover:bg-xero-green-dark transition-colors"
              >
                + Add
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-gray-300 px-4 py-3">No items yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 group">
                    <div className="flex items-center gap-2">
                      {item.emoji && <span>{item.emoji}</span>}
                      <p className="text-sm text-gray-800">{item.name}</p>
                      <span className="text-xs text-gray-400">{item.amount_g}g</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">{item.calories} kcal</span>
                      <button
                        onClick={() => removeItem(id, i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Food picker overlay */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4" onClick={() => setPicking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <p className="text-sm font-semibold text-gray-800 mb-2">Add to {MEAL_TYPES.find(m => m.id === picking.mealType)?.label}</p>
              <input
                autoFocus
                value={picking.search}
                onChange={e => setPicking(p => p && ({ ...p, search: e.target.value }))}
                placeholder="Search food…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filtered.slice(0, 20).map(food => (
                <div key={food.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    {food.emoji && <span>{food.emoji}</span>}
                    <div>
                      <p className="text-sm text-gray-800">{food.name}</p>
                      <p className="text-[10px] text-gray-400">{food.calories_per_100g} kcal/100g</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={amounts[food.id] ?? 100}
                      onChange={e => setAmounts(a => ({ ...a, [food.id]: e.target.value }))}
                      className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none"
                      min={1}
                    />
                    <span className="text-xs text-gray-400">g</span>
                    <button
                      onClick={() => addItem(picking.mealType, food)}
                      className="text-xs bg-xero-green text-white px-2.5 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-6 text-center">No foods found. Add some in the Food Library.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Food library ─────────────────────────────────────────────────────────────

function FoodLibrary() {
  const { foods, isLoading, addFood, deleteFood } = useFoods()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', category: 'other', calories_per_100g: '', emoji: '' })

  const filtered = foods.filter(f =>
    (!catFilter || f.category === catFilter) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await addFood({
      name: form.name.trim(),
      category: form.category,
      calories_per_100g: Number(form.calories_per_100g) || 0,
      emoji: form.emoji.trim() || undefined,
    })
    setForm({ name: '', category: 'other', calories_per_100g: '', emoji: '' })
    setShowAdd(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40 focus:outline-none focus:ring-1 focus:ring-xero-green"
        />
        <button
          onClick={() => setCatFilter(null)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!catFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(catFilter === c ? null : c)}
            className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${catFilter === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors ml-auto"
        >
          + Add Food
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Chicken breast" className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40 focus:outline-none focus:ring-1 focus:ring-xero-green" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none">
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">kcal / 100g</label>
            <input type="number" value={form.calories_per_100g} onChange={e => setForm(p => ({ ...p, calories_per_100g: e.target.value }))}
              placeholder="0" className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-1 focus:ring-xero-green" min={0} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Emoji</label>
            <input value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
              placeholder="🥩" className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-16 focus:outline-none" />
          </div>
          <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-gray-600 px-1">Cancel</button>
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(food => (
          <div key={food.id} className="bg-white rounded-xl border border-gray-100 p-4 group hover:shadow-sm transition-shadow relative">
            <button
              onClick={() => setConfirmId(food.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all leading-none text-base"
            >
              ×
            </button>
            {food.emoji && <p className="text-2xl mb-1">{food.emoji}</p>}
            <p className="text-sm font-semibold text-gray-800 truncate">{food.name}</p>
            <p className="text-[10px] text-gray-400 capitalize mt-0.5">{food.category}</p>
            <p className="text-xs font-bold text-gray-600 mt-2">{food.calories_per_100g} <span className="font-normal text-gray-400">kcal/100g</span></p>
            {confirmId === food.id && (
              <ConfirmDialog
                message={`"${food.name}" will be deleted from your food library.`}
                confirmLabel="Delete"
                onConfirm={() => { deleteFood(food.id); setConfirmId(null) }}
                onCancel={() => setConfirmId(null)}
              />
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-12">No foods yet. Add your first food!</p>
      )}
    </div>
  )
}

// ─── Shopping list ────────────────────────────────────────────────────────────

function ShoppingListView() {
  const { items, saveList } = useShoppingList()
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [newItem, setNewItem] = useState('')

  async function addItem() {
    const v = newItem.trim()
    if (!v) return
    await saveList([...items, v])
    setNewItem('')
  }

  async function removeItem(i: number) {
    await saveList(items.filter((_, idx) => idx !== i))
    setChecked(prev => { const n = new Set(prev); n.delete(i); return n })
  }

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto space-y-4">
      <form onSubmit={e => { e.preventDefault(); addItem() }} className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Add item…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
        />
        <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium">Add</button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Your shopping list is empty.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 group bg-white rounded-xl px-4 py-3 border border-gray-100">
              <button
                onClick={() => setChecked(prev => {
                  const n = new Set(prev)
                  n.has(i) ? n.delete(i) : n.add(i)
                  return n
                })}
                className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  checked.has(i) ? 'bg-xero-green border-xero-green' : 'border-gray-300'
                }`}
              >
                {checked.has(i) && <span className="text-white font-bold" style={{ fontSize: 8 }}>✓</span>}
              </button>
              <p className={`flex-1 text-sm ${checked.has(i) ? 'line-through text-gray-300' : 'text-gray-800'}`}>{item}</p>
              <button
                onClick={() => removeItem(i)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {items.some((_, i) => checked.has(i)) && (
        <button
          onClick={() => {
            const remaining = items.filter((_, i) => !checked.has(i))
            saveList(remaining)
            setChecked(new Set())
          }}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Clear checked items
        </button>
      )}
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type View = 'today' | 'library' | 'shopping'

const VIEWS: { id: View; label: string }[] = [
  { id: 'today',    label: 'Today' },
  { id: 'library',  label: 'Food Library' },
  { id: 'shopping', label: 'Shopping List' },
]

export function MealTab({ onMenuClick }: { onMenuClick?: () => void }) {
  const [view, setView] = useState<View>('today')

  return (
    <div className="flex flex-col h-full bg-xero-bg overflow-hidden">
      <header className="flex items-center gap-1 px-4 py-2.5 bg-white border-b border-xero-border flex-shrink-0">
        {onMenuClick && (
          <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mr-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
        <span className="text-base font-semibold text-gray-800 mr-3">Meal Tracker</span>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              view === v.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {v.label}
          </button>
        ))}
      </header>
      <div className="flex-1 overflow-y-auto">
        {view === 'today'    && <TodayView />}
        {view === 'library'  && <FoodLibrary />}
        {view === 'shopping' && <ShoppingListView />}
      </div>
    </div>
  )
}
