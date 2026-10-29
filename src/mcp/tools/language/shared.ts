import { z } from 'zod'
import type { Request } from 'express'
import type { Pool } from 'pg'

export function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

export function uidOf(req: Request): number {
  return (req.user as Express.User).id
}

// SM-2 scheduling lives in src/lib/srs.ts (shared by the REST routes and MCP tools).
export { sm2, type ReviewKind } from '../../../lib/srs'
import type { ReviewKind } from '../../../lib/srs'

// Review history log per item kind (shared by the REST routes and MCP tools).
export const REVIEW_LOG: Record<ReviewKind, { table: string; column: string }> = {
  vocab:    { table: 'vocab_reviews',    column: 'vocab_id' },
  sentence: { table: 'sentence_reviews', column: 'sentence_id' },
  scenario: { table: 'scenario_reviews', column: 'scenario_id' },
}

export async function logReview(pool: Pool, kind: ReviewKind, uid: number, itemId: number, quality: number, interval: number) {
  const { table, column } = REVIEW_LOG[kind]
  await pool.query(
    `INSERT INTO ${table} (user_id, ${column}, quality, interval) VALUES ($1, $2, $3, $4)`,
    [uid, itemId, quality, interval]
  )
}

export const qualitySchema = z.number().int().min(0).max(5).describe('Recall quality 0-5 (SM-2 scale): 0 = total blackout, 5 = perfect recall')
