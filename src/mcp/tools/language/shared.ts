import { z } from 'zod'
import type { Request } from 'express'

export function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

export function uidOf(req: Request): number {
  return (req.user as Express.User).id
}

// SM-2 spaced-repetition scheduling, shared by vocabulary/sentences/scenarios review tools
// (mirrors the logic in src/api/routes/notebook.ts).
export function sm2(interval: number, repetitions: number, easeFactor: number, quality: number) {
  let i = interval, r = repetitions, e = easeFactor
  if (quality >= 3) {
    i = r === 0 ? 1 : r === 1 ? 6 : Math.round(i * e)
    r += 1
  } else { i = 1; r = 0 }
  e = Math.max(1.3, e + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  const due = new Date()
  due.setDate(due.getDate() + i)
  return { interval: i, repetitions: r, easeFactor: e, dueAt: due.toISOString().slice(0, 10) }
}

export const qualitySchema = z.number().int().min(0).max(5).describe('Recall quality 0-5 (SM-2 scale): 0 = total blackout, 5 = perfect recall')
