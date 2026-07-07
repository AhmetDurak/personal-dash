import { useState, useRef, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFoods, useMealLogs, useShoppingList, useShoppingHistory, useReceipts, localFoodName } from '../hooks/useMeal'
import type { Food, MealItem, MealType, Receipt } from '../hooks/useMeal'
import { ConfirmDialog } from '../components/web/ConfirmDialog'
import { useLanguage } from '../hooks/useLanguage'
import { IconCalendarDay, IconCart, IconRecipes, IconApple, IconSunrise, IconSun, IconMoon, IconCookie, IconMenu, IconEdit, IconList, IconGrid, IconSearch, IconClose, IconTag } from '../lib/icons'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const CATEGORIES = ['protein', 'carbs', 'fat', 'vegetable', 'fruit', 'dairy', 'other']

// ─── Today view ───────────────────────────────────────────────────────────────

function TodayView() {
  const { t, lang } = useLanguage()
  const MEAL_TYPES: { id: MealType; label: string; icon: ReactNode }[] = [
    { id: 'breakfast', label: t.breakfast, icon: <IconSunrise className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'lunch',     label: t.lunch,     icon: <IconSun     className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'dinner',    label: t.dinner,    icon: <IconMoon    className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'snack',     label: t.snack,     icon: <IconCookie  className="w-4 h-4" strokeWidth={1.75} /> },
  ]
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
                <span className="w-4 h-4 flex-shrink-0 text-gray-500">{icon}</span>
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
              <p className="text-sm font-semibold text-gray-800 mb-2">
                {t.addToMeal} {MEAL_TYPES.find(m => m.id === picking.mealType)?.label}
              </p>
              <input
                autoFocus
                value={picking.search}
                onChange={e => setPicking(p => p && ({ ...p, search: e.target.value }))}
                placeholder={t.searchFood}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filtered.slice(0, 20).map(food => {
                const g    = Math.max(1, Number(amounts[food.id] ?? 100) || 1)
                const kcal = Math.round(food.calories_per_100g * g / 100)
                const setG = (n: number) => setAmounts(a => ({ ...a, [food.id]: String(Math.max(1, n)) }))
                return (
                  <div key={food.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Food info */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {food.emoji && <span className="text-lg flex-shrink-0">{food.emoji}</span>}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{localFoodName(food, lang)}</p>
                        <p className="text-[10px] text-gray-400">{kcal} kcal</p>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
                      <button
                        onClick={() => setG(g - 10)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors font-bold text-base leading-none"
                      >−</button>
                      <div className="flex items-center border-x border-gray-200 px-1">
                        <input
                          type="number"
                          value={amounts[food.id] ?? 100}
                          onChange={e => setAmounts(a => ({ ...a, [food.id]: e.target.value }))}
                          onBlur={e => setG(Number(e.target.value))}
                          className="w-9 text-center text-xs font-semibold text-gray-800 outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min={1}
                        />
                        <span className="text-[10px] text-gray-400 -ml-0.5">g</span>
                      </div>
                      <button
                        onClick={() => setG(g + 10)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors font-bold text-base leading-none"
                      >+</button>
                    </div>

                    {/* Add */}
                    <button
                      onClick={() => addItem(picking.mealType, food)}
                      className="text-xs bg-xero-green text-white px-3 py-2 rounded-xl font-semibold hover:bg-xero-green-dark transition-colors flex-shrink-0"
                    >
                      {t.add}
                    </button>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-6 text-center">{t.noFoodsFound}</p>
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
  const { t, lang } = useLanguage()
  const { foods, isLoading, addFood, deleteFood } = useFoods()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', category: 'other', calories_per_100g: '', emoji: '' })

  const q = search.toLowerCase()
  const filtered = foods.filter(f =>
    (!catFilter || f.category === catFilter) &&
    (f.name.toLowerCase().includes(q) ||
     (f.name_de ?? '').toLowerCase().includes(q) ||
     (f.name_tr ?? '').toLowerCase().includes(q))
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
          placeholder={t.searchFood}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-40 focus:outline-none focus:ring-1 focus:ring-xero-green"
        />
        <button
          onClick={() => setCatFilter(null)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!catFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {t.all}
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
          + {t.foodLibrary}
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
          <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium">{t.add}</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-gray-600 px-1">{t.cancel}</button>
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(food => {
          const isGlobal = food.user_id === null
          return (
            <div key={food.id} className="bg-white rounded-xl border border-gray-100 p-4 group hover:shadow-sm transition-shadow relative">
              {isGlobal ? (
                <span className="absolute top-2 right-2 text-[9px] font-semibold text-gray-300 uppercase tracking-wide">Default</span>
              ) : (
                <button
                  onClick={() => setConfirmId(food.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all leading-none text-base"
                >
                  ×
                </button>
              )}
              {food.emoji && <p className="text-2xl mb-1">{food.emoji}</p>}
              <p className="text-sm font-semibold text-gray-800 truncate">{localFoodName(food, lang)}</p>
              <p className="text-[10px] text-gray-400 capitalize mt-0.5">{food.category}</p>
              <p className="text-xs font-bold text-gray-600 mt-2">{food.calories_per_100g} <span className="font-normal text-gray-400">kcal/100g</span></p>
              {confirmId === food.id && (
                <ConfirmDialog
                  message={`"${localFoodName(food, lang)}" will be deleted from your food library.`}
                  confirmLabel="Delete"
                  onConfirm={() => { deleteFood(food.id); setConfirmId(null) }}
                  onCancel={() => setConfirmId(null)}
                />
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-12">No foods yet. Add your first food!</p>
      )}
    </div>
  )
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  name: string
  url: string
  description: string
  tags: string[]
  mealType: string       // 'breakfast' | 'lunch' | 'dinner' | 'snack' | ''
  calories: number | null
}

const MEAL_TYPE_OPTS = ['breakfast', 'lunch', 'dinner', 'snack']

function normalize(r: Partial<Recipe> & { id: string }): Recipe {
  return { tags: [], mealType: '', calories: null, url: '', description: '', ...r } as Recipe
}

function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try { return (JSON.parse(localStorage.getItem('meal:recipes') ?? '[]') as Recipe[]).map(normalize) } catch { return [] }
  })
  function save(next: Recipe[]) {
    setRecipes(next)
    localStorage.setItem('meal:recipes', JSON.stringify(next))
  }
  function add(data: Omit<Recipe, 'id'>) {
    save([...recipes, { id: crypto.randomUUID(), ...data }])
  }
  function update(id: string, fields: Partial<Omit<Recipe, 'id'>>) {
    save(recipes.map(r => r.id === id ? { ...r, ...fields } : r))
  }
  function remove(id: string) { save(recipes.filter(r => r.id !== id)) }
  return { recipes, add, update, remove }
}

function normalizeUrl(u: string) {
  if (!u) return u
  return u.startsWith('http://') || u.startsWith('https://') ? u : `https://${u}`
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, placeholder = 'Add tags… (Enter or ,)' }: {
  tags: string[]
  onChange: (t: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function commit() {
    const t = input.trim().replace(/,$/, '').toLowerCase()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-xero-green min-h-[38px]">
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 text-[11px] bg-xero-green/10 text-xero-green px-2 py-0.5 rounded-full font-medium">
          {t}
          <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="text-xero-green/60 hover:text-xero-green leading-none">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
          if (e.key === 'Backspace' && !input && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={commit}
        placeholder={tags.length ? '' : placeholder}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent placeholder-gray-300"
      />
    </div>
  )
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onUpdate, onRemove, compact = false }: {
  recipe: Recipe
  onUpdate: (fields: Partial<Omit<Recipe, 'id'>>) => void
  onRemove: () => void
  compact?: boolean
}) {
  const [editing, setEditing]     = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [name, setName]           = useState(recipe.name)
  const [url, setUrl]             = useState(recipe.url)
  const [description, setDesc]    = useState(recipe.description)
  const [tags, setTags]           = useState<string[]>(recipe.tags ?? [])
  const [mealType, setMealType]   = useState(recipe.mealType ?? '')
  const [calories, setCalories]   = useState(recipe.calories != null ? String(recipe.calories) : '')

  const desc = recipe.description ?? ''
  const descLong = desc.length > 120 || desc.includes('\n')

  function startEdit() {
    setName(recipe.name); setUrl(recipe.url); setDesc(recipe.description)
    setTags(recipe.tags ?? []); setMealType(recipe.mealType ?? '')
    setCalories(recipe.calories != null ? String(recipe.calories) : '')
    setEditing(true)
  }

  function save() {
    if (!name.trim()) return
    onUpdate({
      name: name.trim(), url: url.trim(), description: description.trim(),
      tags, mealType, calories: calories ? Number(calories) : null,
    })
    setEditing(false)
  }

  function cancel() {
    setName(recipe.name); setUrl(recipe.url); setDesc(recipe.description)
    setTags(recipe.tags ?? []); setMealType(recipe.mealType ?? '')
    setCalories(recipe.calories != null ? String(recipe.calories) : '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-xero-green/40 px-4 py-4 space-y-2.5 shadow-sm">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Recipe name…"
          className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
        />
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Link (optional)…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
        />
        <textarea
          value={description}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description, ingredients, steps… (optional)"
          rows={4}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green resize-y"
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Tags</p>
            <TagInput tags={tags} onChange={setTags} />
          </div>
          <div className="w-32">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Meal type</p>
            <select
              value={mealType}
              onChange={e => setMealType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green capitalize"
            >
              <option value="">—</option>
              {MEAL_TYPE_OPTS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
            </select>
          </div>
          <div className="w-24">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">kcal</p>
            <input
              type="number"
              min={0}
              value={calories}
              onChange={e => setCalories(e.target.value)}
              placeholder="—"
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={!name.trim()}
            className="text-sm bg-xero-green text-white px-4 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40"
          >Save</button>
          <button onClick={cancel}
            className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
          >Cancel</button>
          <button onClick={onRemove}
            className="ml-auto text-sm text-red-400 hover:text-red-500 px-3 py-1.5 transition-colors"
          >Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="group bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-gray-200 transition-colors h-full flex flex-col">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          {recipe.url ? (
            <a href={normalizeUrl(recipe.url)} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold text-xero-green hover:underline break-words leading-snug"
            >{recipe.name}</a>
          ) : (
            <p className="text-sm font-semibold text-gray-800 leading-snug">{recipe.name}</p>
          )}
          {/* Badges row */}
          {(recipe.mealType || recipe.calories != null || (recipe.tags?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {recipe.mealType && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full capitalize">{recipe.mealType}</span>
              )}
              {recipe.calories != null && (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full">{recipe.calories} kcal</span>
              )}
              {recipe.tags?.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 bg-xero-green/10 text-xero-green rounded-full">{t}</span>
              ))}
            </div>
          )}
          {!compact && recipe.url && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{recipe.url}</p>
          )}
          {recipe.description && (
            <div className="mt-1.5">
              <p className={`text-sm text-gray-600 whitespace-pre-wrap ${!expanded ? (compact ? 'line-clamp-2' : 'line-clamp-3') : ''}`}>
                {recipe.description}
              </p>
              {descLong && (
                <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                  className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 transition-colors"
                >{expanded ? 'Show less' : 'Show more'}</button>
              )}
            </div>
          )}
        </div>
        <button onClick={startEdit}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all p-1"
          title="Edit"
        >
          <IconEdit className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

// ─── RecipesView ──────────────────────────────────────────────────────────────

function RecipesView() {
  const { recipes, add, update, remove } = useRecipes()

  // Add form state
  const [showForm, setShowForm]   = useState(false)
  const [fName, setFName]         = useState('')
  const [fUrl, setFUrl]           = useState('')
  const [fDesc, setFDesc]         = useState('')
  const [fTags, setFTags]         = useState<string[]>([])
  const [fMealType, setFMealType] = useState('')
  const [fCalories, setFCalories] = useState('')

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    (localStorage.getItem('meal:recipesView') as 'list' | 'grid') ?? 'list'
  )
  function setView(v: 'list' | 'grid') { setViewMode(v); localStorage.setItem('meal:recipesView', v) }

  // Search & filter state
  const [search, setSearch]           = useState('')
  const [activeTags, setActiveTags]   = useState<string[]>([])
  const [mealTypeFilter, setMTFilter] = useState('')
  const [calMin, setCalMin]           = useState('')
  const [calMax, setCalMax]           = useState('')

  // Derived: all tags across recipes
  const allTags = useMemo(() => {
    const s = new Set<string>()
    recipes.forEach(r => (r.tags ?? []).forEach(t => s.add(t)))
    return [...s].sort()
  }, [recipes])

  // Filtered recipes
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = calMin ? Number(calMin) : null
    const max = calMax ? Number(calMax) : null
    return recipes.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.description ?? '').toLowerCase().includes(q)) return false
      if (activeTags.length && !activeTags.every(t => (r.tags ?? []).includes(t))) return false
      if (mealTypeFilter && r.mealType !== mealTypeFilter) return false
      if (min !== null && r.calories != null && r.calories < min) return false
      if (max !== null && r.calories != null && r.calories > max) return false
      return true
    })
  }, [recipes, search, activeTags, mealTypeFilter, calMin, calMax])

  function toggleTag(t: string) {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!fName.trim()) return
    add({ name: fName.trim(), url: fUrl.trim(), description: fDesc.trim(), tags: fTags, mealType: fMealType, calories: fCalories ? Number(fCalories) : null })
    setFName(''); setFUrl(''); setFDesc(''); setFTags([]); setFMealType(''); setFCalories('')
    setShowForm(false)
  }

  const hasFilters = search || activeTags.length || mealTypeFilter || calMin || calMax

  return (
    <div className="p-4 md:p-6 space-y-3 max-w-4xl mx-auto">

      {/* Row 1: Add + Search + View toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium hover:bg-xero-green-dark transition-colors flex-shrink-0"
          >+ Add Recipe</button>
        )}
        <div className="relative flex-1 min-w-[160px]">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ingredient…"
            className="w-full text-sm border border-gray-200 rounded-lg pl-8 pr-7 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <IconClose className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
          <button onClick={() => setView('list')} title="List view"
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
          ><IconList className="w-3.5 h-3.5" strokeWidth={2} /></button>
          <button onClick={() => setView('grid')} title="Grid view"
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
          ><IconGrid className="w-3.5 h-3.5" strokeWidth={2} /></button>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Meal type */}
        <select
          value={mealTypeFilter}
          onChange={e => setMTFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-xero-green text-gray-600 capitalize"
        >
          <option value="">All meal types</option>
          {MEAL_TYPE_OPTS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
        </select>

        {/* Calorie range */}
        <div className="flex items-center gap-1">
          <input
            type="number" min={0} value={calMin} onChange={e => setCalMin(e.target.value)}
            placeholder="Min kcal"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <span className="text-gray-300 text-xs">—</span>
          <input
            type="number" min={0} value={calMax} onChange={e => setCalMax(e.target.value)}
            placeholder="Max kcal"
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <IconTag className="w-3 h-3 text-gray-300 flex-shrink-0" strokeWidth={2} />
            {allTags.map(t => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                  activeTags.includes(t)
                    ? 'bg-xero-green text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >{t}</button>
            ))}
          </div>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setActiveTags([]); setMTFilter(''); setCalMin(''); setCalMax('') }}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors ml-auto"
          >Clear filters</button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 px-4 py-4 space-y-2.5 shadow-sm">
          <input autoFocus value={fName} onChange={e => setFName(e.target.value)}
            placeholder="Recipe name…"
            className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <input value={fUrl} onChange={e => setFUrl(e.target.value)}
            placeholder="Link (optional)…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <textarea value={fDesc} onChange={e => setFDesc(e.target.value)}
            placeholder="Description, ingredients, steps… (optional)"
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green resize-y"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Tags</p>
              <TagInput tags={fTags} onChange={setFTags} />
            </div>
            <div className="w-32">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Meal type</p>
              <select value={fMealType} onChange={e => setFMealType(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green capitalize"
              >
                <option value="">—</option>
                {MEAL_TYPE_OPTS.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
            </div>
            <div className="w-24">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">kcal</p>
              <input type="number" min={0} value={fCalories} onChange={e => setFCalories(e.target.value)}
                placeholder="—"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!fName.trim()}
              className="text-sm bg-xero-green text-white px-4 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40"
            >Add</button>
            <button type="button" onClick={() => { setShowForm(false); setFName(''); setFUrl(''); setFDesc(''); setFTags([]); setFMealType(''); setFCalories('') }}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
            >Cancel</button>
          </div>
        </form>
      )}

      {recipes.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 text-center py-12">No recipes yet. Add your first one!</p>
      )}

      {recipes.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No recipes match your filters.</p>
      )}

      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-2'}>
        {filtered.map(r => (
          <RecipeCard
            key={r.id}
            recipe={r}
            compact={viewMode === 'grid'}
            onUpdate={fields => update(r.id, fields)}
            onRemove={() => remove(r.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Shopping list ────────────────────────────────────────────────────────────

function ReceiptCard({ receipt, onRemove }: { receipt: Receipt; onRemove: () => void }) {
  const isPdf = receipt.mime_type === 'application/pdf'
  const fileUrl = `/api/receipts/file/${receipt.id}`

  return (
    <div className="group relative w-24 flex-shrink-0">
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        {isPdf ? (
          <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 hover:border-xero-green transition-colors">
            <span className="text-2xl">📄</span>
            <p className="text-[10px] text-gray-400 text-center px-1 truncate w-full leading-tight">
              {receipt.orig_name}
            </p>
          </div>
        ) : (
          <img
            src={fileUrl}
            alt={receipt.orig_name}
            className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:border-xero-green transition-colors"
          />
        )}
      </a>
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none"
      >
        ×
      </button>
    </div>
  )
}

function ShoppingListView() {
  const today = todayStr()
  const [date, setDate] = useState(today)
  const { items, saveList } = useShoppingList(date)
  const { sessions } = useShoppingHistory()
  const { receipts, upload: uploadReceipt, remove: removeReceipt } = useReceipts(date)
  const [checked, setChecked]   = useState<Set<number>>(new Set())
  const [newItem, setNewItem]   = useState('')
  const [editIdx, setEditIdx]   = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await uploadReceipt(file) } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function addItem(text?: string) {
    const v = (text ?? newItem).trim()
    if (!v) return
    if (!items.includes(v)) await saveList([...items, v])
    if (!text) setNewItem('')
  }

  async function removeItem(i: number) {
    await saveList(items.filter((_, idx) => idx !== i))
    setChecked(prev => { const n = new Set(prev); n.delete(i); return n })
  }

  function toggleChecked(i: number) {
    setChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  }

  function startEdit(i: number) { setEditIdx(i); setEditText(items[i]) }

  async function commitEdit() {
    if (editIdx === null) return
    const v = editText.trim()
    if (v && v !== items[editIdx]) {
      const next = [...items]; next[editIdx] = v
      await saveList(next)
    }
    setEditIdx(null)
  }

  function fmtDate(d: string) {
    if (d === today) return 'Today'
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // unique items across all past sessions for the suggestion panel
  const allPastItems = Array.from(
    new Set(sessions.filter(s => s.date !== date).flatMap(s => s.items))
  ).sort()

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main list */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Date selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setChecked(new Set()) }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          {date !== today && (
            <button
              onClick={() => { setDate(today); setChecked(new Set()) }}
              className="text-xs text-xero-green hover:underline"
            >
              Back to today
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{fmtDate(date)}</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
            title="Upload receipt"
          >
            {uploading ? '⏳' : '📄'} {uploading ? 'Uploading…' : 'Receipt'}
          </button>
          {/* Mobile history toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            History
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); addItem() }} className="flex gap-2 mb-4">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add item…"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium hover:bg-xero-green-dark transition-colors">Add</button>
        </form>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">List is empty. Add items or pick from history →</p>
        ) : (
          <div className="space-y-1.5 max-w-md">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 group bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                {editIdx === i ? (
                  <>
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditIdx(null) }}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-xero-green"
                    />
                    <button onClick={commitEdit} className="text-xs text-xero-green font-medium px-1">Save</button>
                    <button onClick={() => setEditIdx(null)} className="text-xs text-gray-400 px-1">Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleChecked(i)}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked.has(i) ? 'bg-xero-green border-xero-green' : 'border-gray-300'}`}
                    >
                      {checked.has(i) && <span className="text-white font-bold" style={{ fontSize: 8 }}>✓</span>}
                    </button>
                    <button
                      onClick={() => toggleChecked(i)}
                      className={`flex-1 text-left text-sm ${checked.has(i) ? 'line-through text-gray-300' : 'text-gray-800'}`}
                    >
                      {item}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => startEdit(i)} className="p-1.5 text-gray-300 hover:text-xero-green transition-colors">
                        <IconEdit className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button onClick={() => removeItem(i)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors leading-none">×</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {items.some((_, i) => checked.has(i)) && (
          <button
            onClick={() => { saveList(items.filter((_, i) => !checked.has(i))); setChecked(new Set()) }}
            className="mt-3 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Clear checked items
          </button>
        )}

        {/* Receipts */}
        {receipts.length > 0 && (
          <div className="mt-6 max-w-md">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Receipts</p>
            <div className="flex flex-wrap gap-2">
              {receipts.map(r => (
                <ReceiptCard key={r.id} receipt={r} onRemove={() => removeReceipt(r.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History sidebar — desktop always visible, mobile drawer */}
      <aside className={`
        ${sidebarOpen ? 'fixed inset-0 z-40 flex items-stretch' : 'hidden'}
        md:relative md:flex md:inset-auto md:z-auto
        w-full md:w-56 lg:w-64 flex-shrink-0
      `}>
        {/* Mobile backdrop */}
        {sidebarOpen && <div className="absolute inset-0 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

        <div className="relative ml-auto md:ml-0 w-72 md:w-full h-full bg-gray-50 border-l border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous items</p>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {/* Past shopping sessions */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No history yet.</p>
            )}

            {/* All unique past items as quick-add chips */}
            {allPastItems.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Quick add</p>
                <div className="flex flex-wrap gap-1">
                  {allPastItems.map(item => (
                    <button
                      key={item}
                      onClick={() => addItem(item)}
                      disabled={items.includes(item)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        items.includes(item)
                          ? 'border-gray-100 text-gray-300 cursor-default'
                          : 'border-gray-200 text-gray-600 hover:border-xero-green hover:text-xero-green bg-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions by date */}
            {sessions.filter(s => s.date !== date).map(session => (
              <div key={session.date}>
                <button
                  onClick={() => setDate(session.date)}
                  className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 hover:text-xero-green transition-colors"
                >
                  {fmtDate(session.date)}
                </button>
                <div className="space-y-0.5">
                  {session.items.map(item => (
                    <button
                      key={item}
                      onClick={() => addItem(item)}
                      disabled={items.includes(item)}
                      className={`w-full text-left text-xs px-2 py-1 rounded-lg transition-colors ${
                        items.includes(item)
                          ? 'text-gray-300 cursor-default'
                          : 'text-gray-600 hover:bg-xero-green/10 hover:text-xero-green'
                      }`}
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type View = 'today' | 'library' | 'shopping' | 'recipes'

export function MealTab({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') as View) ?? (localStorage.getItem('meal:view') as View) ?? 'today'
  function setView(v: View) { localStorage.setItem('meal:view', v); setSearchParams({ view: v }) }
  const VIEWS: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'today',    label: t.today,        icon: <IconCalendarDay className="w-3.5 h-3.5" strokeWidth={2} /> },
    { id: 'shopping', label: t.shoppingList, icon: <IconCart        className="w-3.5 h-3.5" strokeWidth={2} /> },
    { id: 'recipes',  label: t.recipes,      icon: <IconRecipes     className="w-3.5 h-3.5" strokeWidth={2} /> },
    { id: 'library',  label: t.foodLibrary,  icon: <IconApple       className="w-3.5 h-3.5" strokeWidth={2} /> },
  ]

  return (
    <div className="flex flex-col h-full bg-xero-bg overflow-hidden">
      <header className="flex items-center gap-1 px-4 py-2.5 bg-white border-b border-xero-border flex-shrink-0 overflow-hidden">
        {onMenuClick && (
          <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
            <IconMenu className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
        <span className="text-sm font-semibold text-gray-900 flex-shrink-0 mr-1">{t.mealTracker}</span>
        <div className="flex overflow-x-auto gap-1 flex-1" style={{ scrollbarWidth: 'none' }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                view === v.id ? 'bg-xero-green text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {v.icon}{v.label}
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {view === 'today'    && <TodayView />}
        {view === 'library'  && <FoodLibrary />}
        {view === 'recipes'  && <RecipesView />}
        {view === 'shopping' && <ShoppingListView />}
      </div>
    </div>
  )
}
