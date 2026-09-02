import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { computeTotalScore, computeWordCount, computeStats, EVALUATION_CRITERIA, type EvaluationScores } from '../../lib/reading'

const STAGE_ORDER = ['reading', 'recall', 'evaluate', 'improve', 'reflect', 'completed'] as const
type Stage = typeof STAGE_ORDER[number]

function stageIndex(status: string): number {
  return STAGE_ORDER.indexOf(status as Stage)
}

function toCamel(row: Record<string, unknown>) {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    category: row.category,
    sourceContent: row.source_content,
    readingStartedAt: row.reading_started_at,
    readingTimeSec: row.reading_time_sec,
    summaryMainIdea: row.summary_main_idea,
    summaryPoint1: row.summary_point_1,
    summaryPoint2: row.summary_point_2,
    summaryPoint3: row.summary_point_3,
    summaryImportance: row.summary_importance,
    summaryExample: row.summary_example,
    summaryWordCount: row.summary_word_count,
    evaluationScores: row.evaluation_scores,
    totalScore: row.total_score,
    biggestWeakness: row.biggest_weakness,
    weaknessNote: row.weakness_note,
    improvedSummary: row.improved_summary,
    reflectionLearned: row.reflection_learned,
    canExplain2min: row.can_explain_2min,
    takeaway: row.takeaway,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

export function readingRouter(pool: Pool): Router {
  const router = Router()

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query('SELECT * FROM reading_sessions WHERE user_id = $1 ORDER BY created_at DESC', [uid])
    res.json(rows.map(toCamel))
  })

  router.get('/stats', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT status, total_score, reading_time_sec, biggest_weakness, completed_at FROM reading_sessions WHERE user_id = $1',
      [uid]
    )
    const stats = computeStats(rows.map(r => ({
      status: r.status as string,
      totalScore: r.total_score as number | null,
      readingTimeSec: r.reading_time_sec as number | null,
      biggestWeakness: r.biggest_weakness as string | null,
      completedAt: r.completed_at ? (r.completed_at as Date).toISOString() : null,
    })))
    res.json(stats)
  })

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, category, sourceContent } = req.body as { title: string; category?: string | null; sourceContent: string }
    if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return }
    if (!sourceContent?.trim()) { res.status(400).json({ error: 'sourceContent required' }); return }
    const { rows } = await pool.query(
      `INSERT INTO reading_sessions (title, category, source_content, user_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title.trim(), category?.trim() || null, sourceContent, uid]
    )
    res.json(toCamel(rows[0]))
  })

  // Only while status='reading' — editing the source after recall has started
  // would defeat the "summarize from memory" exercise.
  router.patch('/:id/source', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const b = req.body as Partial<{ title: string; category: string | null; sourceContent: string }>
    const { rows: existingRows } = await pool.query(
      `SELECT * FROM reading_sessions WHERE id=$1 AND user_id=$2 AND status='reading'`,
      [req.params.id, uid]
    )
    const existing = existingRows[0]
    if (!existing) { res.json(null); return }

    const title = b.title !== undefined ? b.title.trim() || existing.title : existing.title
    const category = b.category !== undefined ? (b.category?.trim() || null) : existing.category
    const sourceContent = b.sourceContent !== undefined ? b.sourceContent : existing.source_content

    const { rows } = await pool.query(
      `UPDATE reading_sessions SET title=$1, category=$2, source_content=$3, updated_at=now()
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [title, category, sourceContent, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.patch('/:id/recall', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      `UPDATE reading_sessions
       SET status = 'recall',
           reading_time_sec = GREATEST(0, EXTRACT(EPOCH FROM (now() - reading_started_at))::int),
           updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status = 'reading'
       RETURNING *`,
      [req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.patch('/:id/summary', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const b = req.body as Partial<{
      mainIdea: string; point1: string; point2: string; point3: string; importance: string; example: string
    }>
    const { rows: existingRows } = await pool.query('SELECT * FROM reading_sessions WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    const existing = existingRows[0]
    if (!existing) { res.json(null); return }

    const fields = {
      mainIdea: b.mainIdea ?? existing.summary_main_idea,
      point1: b.point1 ?? existing.summary_point_1,
      point2: b.point2 ?? existing.summary_point_2,
      point3: b.point3 ?? existing.summary_point_3,
      importance: b.importance ?? existing.summary_importance,
      example: b.example ?? existing.summary_example,
    }
    const { words } = computeWordCount(fields)

    const { rows } = await pool.query(
      `UPDATE reading_sessions
       SET summary_main_idea=$1, summary_point_1=$2, summary_point_2=$3, summary_point_3=$4,
           summary_importance=$5, summary_example=$6, summary_word_count=$7, updated_at=now()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [fields.mainIdea, fields.point1, fields.point2, fields.point3, fields.importance, fields.example, words, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.patch('/:id/advance', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { status } = req.body as { status: string }
    const { rows: existingRows } = await pool.query('SELECT status FROM reading_sessions WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    const existing = existingRows[0]
    if (!existing) { res.json(null); return }
    if (stageIndex(status) <= stageIndex(existing.status) || stageIndex(status) === -1) {
      res.status(400).json({ error: 'invalid stage transition' })
      return
    }
    const { rows } = await pool.query(
      'UPDATE reading_sessions SET status=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [status, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.put('/:id/evaluation', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { scores, biggestWeakness, weaknessNote } = req.body as {
      scores: EvaluationScores; biggestWeakness?: string | null; weaknessNote?: string | null
    }
    for (const key of EVALUATION_CRITERIA) {
      if (!scores?.[key]) { res.status(400).json({ error: `missing score for ${key}` }); return }
    }
    const total = computeTotalScore(scores)
    const { rows } = await pool.query(
      `UPDATE reading_sessions
       SET evaluation_scores=$1, total_score=$2, biggest_weakness=$3, weakness_note=$4, status='improve', updated_at=now()
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [JSON.stringify(scores), total, biggestWeakness ?? null, weaknessNote ?? null, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.patch('/:id/improved-summary', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { improvedSummary } = req.body as { improvedSummary: string }
    const { rows } = await pool.query(
      'UPDATE reading_sessions SET improved_summary=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [improvedSummary, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.put('/:id/reflection', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { reflectionLearned, canExplain2min, takeaway } = req.body as {
      reflectionLearned?: string; canExplain2min?: boolean; takeaway?: string
    }
    const { rows } = await pool.query(
      `UPDATE reading_sessions
       SET reflection_learned=$1, can_explain_2min=$2, takeaway=$3, status='completed', completed_at=now(), updated_at=now()
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [reflectionLearned ?? null, canExplain2min ?? null, takeaway ?? null, req.params.id, uid]
    )
    res.json(rows[0] ? toCamel(rows[0]) : null)
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM reading_sessions WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
