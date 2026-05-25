import useSWR from 'swr'
import { API_BASE } from '../config'

export type ExerciseType = 'calisthenics' | 'weights' | 'cardio' | 'flexibility'
export type MuscleGroup = 'arm' | 'chest' | 'back' | 'leg' | 'core' | 'shoulder'

export interface Exercise {
  id: number
  name: string
  type: ExerciseType
  muscle_groups: MuscleGroup[]
  description: string | null
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
}

export interface FitnessTarget {
  id: number
  name: string
  unit: string
  target_value: number
  current_value: number
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export function useExercises() {
  const { data, mutate, isLoading } = useSWR<Exercise[]>('/api/sport/exercises')

  async function addExercise(payload: { name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description?: string }) {
    await fetch(`${API_BASE}/api/sport/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateExercise(id: number, payload: { name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description?: string }) {
    await fetch(`${API_BASE}/api/sport/exercises/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function deleteExercise(id: number) {
    await fetch(`${API_BASE}/api/sport/exercises/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { exercises: data ?? [], isLoading, addExercise, updateExercise, deleteExercise }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function useTemplates() {
  const { data, mutate } = useSWR<WorkoutTemplate[]>('/api/sport/templates')

  async function addTemplate(name: string, exercises: TemplateExercise[]) {
    await fetch(`${API_BASE}/api/sport/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, exercises }),
    })
    await mutate()
  }

  return { templates: data ?? [], addTemplate }
}

// ─── Workout Logs ─────────────────────────────────────────────────────────────

export function useWorkoutLogs(month: string) {
  const { data, mutate } = useSWR<WorkoutLog[]>(`/api/sport/logs?month=${month}`)

  async function logWorkout(payload: { template_id?: number; date: string; sets: WorkoutSetGroup[]; notes?: string; duration_min?: number }) {
    await fetch(`${API_BASE}/api/sport/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateLog(id: number, payload: { template_id?: number; date: string; sets: WorkoutSetGroup[]; notes?: string; duration_min?: number }) {
    await fetch(`${API_BASE}/api/sport/logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function deleteLog(id: number) {
    await fetch(`${API_BASE}/api/sport/logs/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { logs: data ?? [], logWorkout, updateLog, deleteLog }
}

// ─── Targets ──────────────────────────────────────────────────────────────────

export function useFitnessTargets() {
  const { data, mutate, isLoading } = useSWR<FitnessTarget[]>('/api/sport/targets')

  async function addTarget(payload: { name: string; unit: string; target_value: number }) {
    await fetch(`${API_BASE}/api/sport/targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function updateTarget(id: number, current_value: number) {
    const target = data?.find(t => t.id === id)
    if (!target) return
    await fetch(`${API_BASE}/api/sport/targets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...target, current_value }),
    })
    await mutate()
  }

  async function deleteTarget(id: number) {
    await fetch(`${API_BASE}/api/sport/targets/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { targets: data ?? [], isLoading, addTarget, updateTarget, deleteTarget }
}
