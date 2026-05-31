import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

export function sportRouter(pool: Pool): Router {
  const router = Router()

  // ─── Exercises ────────────────────────────────────────────────────────────

  router.get('/exercises', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM exercises WHERE user_id=$1 ORDER BY name ASC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/exercises', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, type, muscle_groups = [], description } = req.body
    const { rows } = await pool.query(
      'INSERT INTO exercises (user_id,name,type,muscle_groups,description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [uid, name, type, muscle_groups, description ?? null]
    )
    res.json(rows[0])
  })

  router.put('/exercises/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, type, muscle_groups = [], description } = req.body
    const { rows } = await pool.query(
      'UPDATE exercises SET name=$1, type=$2, muscle_groups=$3, description=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [name, type, muscle_groups, description ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? {})
  })

  router.delete('/exercises/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM exercises WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Templates ────────────────────────────────────────────────────────────

  router.get('/templates', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM workout_templates WHERE user_id=$1 ORDER BY name ASC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/templates', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, exercises = [] } = req.body
    const { rows } = await pool.query(
      'INSERT INTO workout_templates (user_id,name,exercises) VALUES ($1,$2,$3) RETURNING *',
      [uid, name, JSON.stringify(exercises)]
    )
    res.json(rows[0])
  })

  router.put('/templates/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, exercises = [] } = req.body
    const { rows } = await pool.query(
      'UPDATE workout_templates SET name=$1, exercises=$2 WHERE id=$3 AND user_id=$4 RETURNING *',
      [name, JSON.stringify(exercises), req.params.id, uid]
    )
    res.json(rows[0])
  })

  router.delete('/templates/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM workout_templates WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Workout logs ─────────────────────────────────────────────────────────

  router.get('/logs', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const month = req.query.month as string
    let query = 'SELECT * FROM workout_logs WHERE user_id=$1'
    const params: (string | number)[] = [uid]
    if (month) {
      query += ' AND date >= $2 AND date < $3'
      params.push(`${month}-01`, `${month}-01`)
      // compute next month
      const [y, m] = month.split('-').map(Number)
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      params[2] = `${next}-01`
    }
    query += ' ORDER BY date DESC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  })

  router.post('/logs', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { template_id, date, sets = [], notes, duration_min } = req.body
    const { rows } = await pool.query(
      'INSERT INTO workout_logs (user_id,template_id,date,sets,notes,duration_min) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [uid, template_id ?? null, date, JSON.stringify(sets), notes ?? null, duration_min ?? null]
    )
    res.json(rows[0])
  })

  router.put('/logs/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { template_id, date, sets = [], notes, duration_min } = req.body
    const { rows } = await pool.query(
      'UPDATE workout_logs SET date=$1, sets=$2, notes=$3, duration_min=$4, template_id=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [date, JSON.stringify(sets), notes ?? null, duration_min ?? null, template_id ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? {})
  })

  router.delete('/logs/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM workout_logs WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Targets ──────────────────────────────────────────────────────────────

  router.get('/targets', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM fitness_targets WHERE user_id=$1 ORDER BY name ASC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/targets', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, unit = 'reps', target_value, current_value = 0 } = req.body
    const { rows } = await pool.query(
      'INSERT INTO fitness_targets (user_id,name,unit,target_value,current_value) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [uid, name, unit, target_value, current_value]
    )
    res.json(rows[0])
  })

  router.put('/targets/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { name, unit, target_value, current_value } = req.body
    const { rows } = await pool.query(
      'UPDATE fitness_targets SET name=$1, unit=$2, target_value=$3, current_value=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [name, unit, target_value, current_value, req.params.id, uid]
    )
    res.json(rows[0])
  })

  router.delete('/targets/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM fitness_targets WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Challenges ───────────────────────────────────────────────────────────

  router.get('/challenges', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const scope = req.query.scope as string | undefined
    const { rows } = await pool.query(
      `SELECT * FROM challenges WHERE user_id=$1 ${scope ? 'AND scope=$2' : ''} ORDER BY created_at DESC`,
      scope ? [uid, scope] : [uid]
    )
    res.json(rows)
  })

  router.post('/challenges', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { scope = 'general', title, description, target_value, target_unit,
            start_date, end_date, repeat_cycle = 'none', checkpoints = [] } = req.body
    const { rows } = await pool.query(
      `INSERT INTO challenges
        (user_id, scope, title, description, target_value, target_unit,
         start_date, end_date, repeat_cycle, checkpoints)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uid, scope, title, description ?? null, target_value ?? null, target_unit ?? null,
       start_date ?? new Date().toISOString().slice(0, 10),
       end_date ?? null, repeat_cycle, JSON.stringify(checkpoints)]
    )
    res.json(rows[0])
  })

  router.put('/challenges/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, description, target_value, target_unit, start_date, end_date,
            repeat_cycle, status, checkpoints } = req.body
    const { rows } = await pool.query(
      `UPDATE challenges SET
        title=$1, description=$2, target_value=$3, target_unit=$4,
        start_date=$5, end_date=$6, repeat_cycle=$7, status=$8,
        checkpoints=$9, updated_at=now()
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      [title, description ?? null, target_value ?? null, target_unit ?? null,
       start_date, end_date ?? null, repeat_cycle, status,
       JSON.stringify(checkpoints), req.params.id, uid]
    )
    res.json(rows[0])
  })

  router.delete('/challenges/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM challenges WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  return router
}
