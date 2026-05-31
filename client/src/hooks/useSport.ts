import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export type ExerciseType = 'calisthenics' | 'weights' | 'cardio' | 'flexibility'
export type MuscleGroup = 'arm' | 'chest' | 'back' | 'leg' | 'core' | 'shoulder'

export interface Exercise {
  id: number
  name: string
  type: ExerciseType
  muscle_groups: MuscleGroup[]
  description: string | null
  created_at: string
}

export interface TemplateExercise {
  exercise_id: number
  name: string
  sets: number
  reps: number
  rest_sec: number
}

export interface WorkoutTemplate {
  id: number
  name: string
  exercises: TemplateExercise[]
  created_at: string
}

export interface SetEntry {
  reps: number
  weight_kg: number | null
}

export interface WorkoutSetGroup {
  exercise_name: string
  sets: SetEntry[]
}

export interface WorkoutLog {
  id: number
  template_id: number | null
  date: string
  sets: WorkoutSetGroup[]
  notes: string | null
  duration_min: number | null
  created_at: string
}

export interface FitnessTarget {
  id: number
  name: string
  unit: string
  target_value: number
  current_value: number
  created_at: string
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export function useExercises() {
  const { data, mutate, isLoading } = useSWR<Exercise[]>('/api/sport/exercises', fetcher)

  async function addExercise(payload: { name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description?: string }) {
    await fetch('/api/sport/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateExercise(id: number, payload: { name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description?: string }) {
    await fetch(`/api/sport/exercises/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function deleteExercise(id: number) {
    await fetch(`/api/sport/exercises/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { exercises: data ?? [], isLoading, addExercise, updateExercise, deleteExercise }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function useTemplates() {
  const { data, mutate, isLoading } = useSWR<WorkoutTemplate[]>('/api/sport/templates', fetcher)

  async function addTemplate(name: string, exercises: TemplateExercise[]) {
    await fetch('/api/sport/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, exercises }),
    })
    await mutate()
  }

  async function updateTemplate(id: number, name: string, exercises: TemplateExercise[]) {
    await fetch(`/api/sport/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, exercises }),
    })
    await mutate()
  }

  async function deleteTemplate(id: number) {
    await fetch(`/api/sport/templates/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { templates: data ?? [], isLoading, addTemplate, updateTemplate, deleteTemplate }
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export function useWorkoutLogs(month: string) {
  const { data, mutate } = useSWR<WorkoutLog[]>(`/api/sport/logs?month=${month}`, fetcher)

  async function logWorkout(payload: { template_id?: number; date: string; sets: WorkoutSetGroup[]; notes?: string; duration_min?: number }) {
    await fetch('/api/sport/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateLog(id: number, payload: { template_id?: number; date: string; sets: WorkoutSetGroup[]; notes?: string; duration_min?: number }) {
    await fetch(`/api/sport/logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function deleteLog(id: number) {
    await fetch(`/api/sport/logs/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { logs: data ?? [], logWorkout, updateLog, deleteLog }
}

// ─── Targets ──────────────────────────────────────────────────────────────────

export function useFitnessTargets() {
  const { data, mutate, isLoading } = useSWR<FitnessTarget[]>('/api/sport/targets', fetcher)

  async function addTarget(payload: { name: string; unit: string; target_value: number }) {
    await fetch('/api/sport/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateTarget(id: number, current_value: number) {
    const target = data?.find(t => t.id === id)
    if (!target) return
    await fetch(`/api/sport/targets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...target, current_value }),
    })
    await mutate()
  }

  async function deleteTarget(id: number) {
    await fetch(`/api/sport/targets/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { targets: data ?? [], isLoading, addTarget, updateTarget, deleteTarget }
}

// ─── Body weight ──────────────────────────────────────────────────────────────

export interface BodyWeightEntry {
  id:         number
  user_id:    number
  date:       string
  weight_kg:  number
  note:       string | null
  created_at: string
}

export function useBodyWeight() {
  const { data, mutate, isLoading } = useSWR<BodyWeightEntry[]>('/api/sport/weight', fetcher)

  async function addEntry(date: string, weight_kg: number, note?: string) {
    await fetch('/api/sport/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, weight_kg, note }),
    })
    await mutate()
  }

  async function deleteEntry(id: number) {
    await fetch(`/api/sport/weight/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { entries: data ?? [], isLoading, addEntry, deleteEntry }
}
