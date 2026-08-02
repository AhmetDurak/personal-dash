import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { vault } from '../obsidian/vaultAdapter'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const ATTACHMENT_DIR = path.join(process.cwd(), 'uploads', 'notebook')
fs.mkdirSync(ATTACHMENT_DIR, { recursive: true })

const attachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ATTACHMENT_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const attachmentUpload = multer({ storage: attachmentStorage, limits: { fileSize: 20 * 1024 * 1024 } })

export function notebookRouter(pool: Pool): Router {
  const router = Router()

  // ─── Attachments ────────────────────────────────────────────────────────────

  router.post('/attachments', attachmentUpload.single('file'), (req: Request, res: Response) => {
    const file = req.file
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return }
    res.json({
      url: `/api/notebook/attachments/${file.filename}`,
      name: file.originalname,
      mime: file.mimetype,
    })
  })

  router.get('/attachments/:filename', (req: Request, res: Response) => {
    const { filename } = req.params
    if (filename.includes('/') || filename.includes('..')) { res.status(400).end(); return }
    res.sendFile(path.join(ATTACHMENT_DIR, filename))
  })

  // ─── Notes ──────────────────────────────────────────────────────────────────

  router.get('/notes', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    if (vault.enabled()) return res.json(vault.list(uid))
    const { rows } = await pool.query(
      'SELECT * FROM notebook_notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/notes', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title = 'Untitled', content = '', folder = null } = req.body as { title?: string; content?: string; folder?: string | null }
    if (vault.enabled()) return res.json(vault.create(title, content, folder, uid))
    const { rows } = await pool.query(
      'INSERT INTO notebook_notes (title, content, folder, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, folder, uid]
    )
    res.json(rows[0])
  })

  router.put('/notes/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, content } = req.body as { title: string; content: string }
    if (vault.enabled()) return res.json(vault.update(req.params.id, title, content, uid))
    const { rows } = await pool.query(
      'UPDATE notebook_notes SET title=$1, content=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [title, content, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.patch('/notes/folder-rename', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { oldPath, newPath } = req.body as { oldPath: string; newPath: string }
    if (!oldPath?.trim() || !newPath?.trim()) { res.status(400).json({ error: 'oldPath and newPath required' }); return }
    if (vault.enabled()) { vault.renameFolder(oldPath, newPath, uid); res.json({ ok: true }); return }
    await pool.query(
      `UPDATE notebook_notes
       SET folder = CASE
         WHEN folder = $1 THEN $2
         ELSE $2 || SUBSTRING(folder FROM LENGTH($1) + 1)
       END, updated_at = now()
       WHERE user_id = $3 AND (folder = $1 OR folder LIKE $4)`,
      [oldPath, newPath, uid, oldPath + '/%']
    )
    res.json({ ok: true })
  })

  router.patch('/notes/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    if (vault.enabled()) return res.json(vault.updateFolder(req.params.id, folder ?? null, uid))
    const { rows } = await pool.query(
      'UPDATE notebook_notes SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/notes/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { path } = req.query as { path: string }
    if (!path?.trim()) { res.status(400).json({ error: 'path required' }); return }
    await pool.query(
      `DELETE FROM notebook_notes WHERE user_id = $1 AND (folder = $2 OR folder LIKE $3)`,
      [uid, path, path + '/%']
    )
    res.json({ ok: true })
  })

  router.delete('/notes/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    if (vault.enabled()) { vault.delete(req.params.id, uid); return res.json({ ok: true }) }
    await pool.query('DELETE FROM notebook_notes WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Mindmaps ────────────────────────────────────────────────────────────────

  router.get('/mindmaps', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT id, title, folder, created_at, updated_at FROM mindmaps WHERE user_id = $1 ORDER BY updated_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.get('/mindmaps/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM mindmaps WHERE id=$1 AND user_id=$2',
      [req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.post('/mindmaps', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title = 'New Map', nodes = [], edges = [], folder = null } = req.body as { title?: string; nodes?: unknown[]; edges?: unknown[]; folder?: string | null }
    const { rows } = await pool.query(
      'INSERT INTO mindmaps (title, nodes, edges, folder, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, JSON.stringify(nodes), JSON.stringify(edges), folder, uid]
    )
    res.json(rows[0])
  })

  router.patch('/mindmaps/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    const { rows } = await pool.query(
      'UPDATE mindmaps SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id, title, folder, created_at, updated_at',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.put('/mindmaps/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, nodes, edges = [] } = req.body as { title: string; nodes: unknown[]; edges?: unknown[] }
    const { rows } = await pool.query(
      'UPDATE mindmaps SET title=$1, nodes=$2, edges=$3, updated_at=now() WHERE id=$4 AND user_id=$5 RETURNING *',
      [title, JSON.stringify(nodes), JSON.stringify(edges), req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/mindmaps/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM mindmaps WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // ─── Vocabulary ──────────────────────────────────────────────────────────────

  router.get('/vocabulary', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM vocabulary WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/vocabulary', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { word, translation, language = 'de', translation_language = 'tr', image_url, example } = req.body as {
      word: string; translation: string; language?: string; translation_language?: string; image_url?: string; example?: string
    }
    if (!word?.trim() || !translation?.trim()) {
      res.status(400).json({ error: 'word and translation required' }); return
    }
    const { rows } = await pool.query(
      `INSERT INTO vocabulary (word, translation, language, translation_language, image_url, example, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (LOWER(word), language, user_id) DO UPDATE
         SET translation=EXCLUDED.translation, translation_language=EXCLUDED.translation_language,
             image_url=EXCLUDED.image_url, example=EXCLUDED.example
       RETURNING *`,
      [word.trim(), translation.trim(), language, translation_language, image_url ?? null, example ?? null, uid]
    )
    res.json(rows[0])
  })

  router.post('/vocabulary/bulk', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const items = (req.body as { items: { word: string; translation: string; language?: string; translation_language?: string; example?: string }[] }).items ?? []
    const valid = items.filter(i => i.word?.trim() && i.translation?.trim())
    if (!valid.length) { res.json({ inserted: 0 }); return }
    const values = valid.map((_, i) => `($${i * 6 + 1},$${i * 6 + 2},$${i * 6 + 3},$${i * 6 + 4},$${i * 6 + 5},$${i * 6 + 6})`).join(',')
    const params: (string | null)[] = valid.flatMap(i => [
      i.word.trim(), i.translation.trim(), i.language ?? 'de', i.translation_language ?? 'tr', i.example?.trim() ?? null, String(uid),
    ])
    await pool.query(
      `INSERT INTO vocabulary (word, translation, language, translation_language, example, user_id) VALUES ${values}
       ON CONFLICT (LOWER(word), language, user_id) DO UPDATE
         SET translation=EXCLUDED.translation, example=EXCLUDED.example`,
      params
    )
    res.json({ inserted: valid.length })
  })

  router.put('/vocabulary/bulk-move', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { ids, language } = req.body as { ids: number[]; language: string }
    if (!ids?.length || !language) { res.status(400).json({ error: 'ids and language required' }); return }
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',')
    await pool.query(
      `UPDATE vocabulary SET language=$1 WHERE id IN (${placeholders}) AND user_id=$${ids.length + 2}`,
      [language, ...ids, uid]
    )
    res.json({ moved: ids.length })
  })

  router.put('/vocabulary/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { word, translation, language, translation_language = 'tr', image_url, example } = req.body as {
      word: string; translation: string; language: string; translation_language?: string; image_url?: string; example?: string
    }
    const { rows } = await pool.query(
      'UPDATE vocabulary SET word=$1, translation=$2, language=$3, translation_language=$4, image_url=$5, example=$6 WHERE id=$7 AND user_id=$8 RETURNING *',
      [word, translation, language, translation_language, image_url ?? null, example ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/vocabulary/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM vocabulary WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  // SM-2 spaced repetition review
  router.post('/vocabulary/:id/review', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const quality = Number((req.body as { quality: number }).quality) // 0–5
    const { rows } = await pool.query('SELECT * FROM vocabulary WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    if (!rows[0]) { res.status(404).json({ error: 'not found' }); return }

    let { interval, repetitions } = rows[0] as { interval: number; repetitions: number }
    let easeFactor = Number((rows[0] as { ease_factor: string }).ease_factor)

    if (quality >= 3) {
      if (repetitions === 0)      interval = 1
      else if (repetitions === 1) interval = 6
      else                        interval = Math.round(interval * easeFactor)
      repetitions += 1
    } else {
      repetitions = 0
      interval    = 1
    }

    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    )

    const due = new Date()
    due.setDate(due.getDate() + interval)
    const dueAt = due.toISOString().slice(0, 10)

    const { rows: updated } = await pool.query(
      'UPDATE vocabulary SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [interval, repetitions, easeFactor, dueAt, req.params.id, uid]
    )
    res.json(updated[0])
  })

  router.patch('/vocabulary/folder-rename', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { oldPath, newPath } = req.body as { oldPath: string; newPath: string }
    if (!oldPath?.trim() || !newPath?.trim()) { res.status(400).json({ error: 'oldPath and newPath required' }); return }
    await pool.query(
      `UPDATE vocabulary SET folder = CASE WHEN folder = $1 THEN $2 ELSE $2 || SUBSTRING(folder FROM LENGTH($1) + 1) END
       WHERE user_id = $3 AND (folder = $1 OR folder LIKE $4)`,
      [oldPath, newPath, uid, oldPath + '/%']
    )
    res.json({ ok: true })
  })

  router.patch('/vocabulary/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    const { rows } = await pool.query(
      'UPDATE vocabulary SET folder=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/vocabulary/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { path } = req.query as { path: string }
    if (!path?.trim()) { res.status(400).json({ error: 'path required' }); return }
    await pool.query(
      `DELETE FROM vocabulary WHERE user_id = $1 AND (folder = $2 OR folder LIKE $3)`,
      [uid, path, path + '/%']
    )
    res.json({ ok: true })
  })

  // ─── SM-2 helper (shared by sentences and scenarios) ─────────────────────────

  function sm2(interval: number, repetitions: number, easeFactor: number, quality: number) {
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

  // ─── Language Sentences ───────────────────────────────────────────────────────

  router.get('/language/sentences', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM language_sentences WHERE user_id=$1 ORDER BY due_at ASC, updated_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/language/sentences/bulk', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const items = (req.body as { items: { source_text: string; translation?: string; source_lang?: string; target_lang?: string }[] }).items ?? []
    const valid = items.filter(i => i.source_text?.trim())
    if (!valid.length) { res.json({ inserted: 0 }); return }
    let inserted = 0
    for (const i of valid) {
      await pool.query(
        `INSERT INTO language_sentences (user_id, source_text, translation, source_lang, target_lang)
         VALUES ($1,$2,$3,$4,$5)`,
        [uid, i.source_text.trim(), i.translation?.trim() || null, i.source_lang ?? 'de', i.target_lang ?? 'tr']
      )
      inserted++
    }
    res.json({ inserted })
  })

  router.post('/language/sentences', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { source_text = '', translation = null, source_lang = 'de', target_lang = 'tr',
            memory_palace = null, image_url = null } = req.body as Record<string, unknown>
    const { rows } = await pool.query(
      `INSERT INTO language_sentences
         (user_id, source_text, translation, source_lang, target_lang, memory_palace, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uid, source_text, translation, source_lang, target_lang, memory_palace, image_url]
    )
    res.json(rows[0])
  })

  router.put('/language/sentences/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { source_text, translation, source_lang, target_lang, word_links = [],
            memory_palace = null, image_url = null } = req.body as Record<string, unknown>
    const { rows } = await pool.query(
      `UPDATE language_sentences
       SET source_text=$1, translation=$2, source_lang=$3, target_lang=$4,
           word_links=$5, memory_palace=$6, image_url=$7, updated_at=now()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [source_text, translation, source_lang, target_lang,
       JSON.stringify(word_links), memory_palace, image_url, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.post('/language/sentences/:id/review', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const quality = Number((req.body as { quality: number }).quality)
    const { rows } = await pool.query('SELECT * FROM language_sentences WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    if (!rows[0]) { res.status(404).json({ error: 'not found' }); return }
    const { interval, repetitions, ease_factor } = rows[0] as { interval: number; repetitions: number; ease_factor: string }
    const sr = sm2(interval, repetitions, Number(ease_factor), quality)
    const { rows: updated } = await pool.query(
      'UPDATE language_sentences SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [sr.interval, sr.repetitions, sr.easeFactor, sr.dueAt, req.params.id, uid]
    )
    res.json(updated[0])
  })

  router.delete('/language/sentences/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM language_sentences WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  router.patch('/language/sentences/folder-rename', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { oldPath, newPath } = req.body as { oldPath: string; newPath: string }
    if (!oldPath?.trim() || !newPath?.trim()) { res.status(400).json({ error: 'oldPath and newPath required' }); return }
    await pool.query(
      `UPDATE language_sentences SET folder = CASE WHEN folder = $1 THEN $2 ELSE $2 || SUBSTRING(folder FROM LENGTH($1) + 1) END
       WHERE user_id = $3 AND (folder = $1 OR folder LIKE $4)`,
      [oldPath, newPath, uid, oldPath + '/%']
    )
    res.json({ ok: true })
  })

  router.patch('/language/sentences/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    const { rows } = await pool.query(
      'UPDATE language_sentences SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/language/sentences/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { path } = req.query as { path: string }
    if (!path?.trim()) { res.status(400).json({ error: 'path required' }); return }
    await pool.query(
      `DELETE FROM language_sentences WHERE user_id = $1 AND (folder = $2 OR folder LIKE $3)`,
      [uid, path, path + '/%']
    )
    res.json({ ok: true })
  })

  // ─── Language Scenarios ───────────────────────────────────────────────────────

  router.get('/language/scenarios', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM language_scenarios WHERE user_id=$1 ORDER BY due_at ASC, updated_at DESC',
      [uid]
    )
    res.json(rows)
  })

  router.post('/language/scenarios/bulk', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const items = (req.body as { items: { title: string; content?: string; source_lang?: string; target_lang?: string }[] }).items ?? []
    const valid = items.filter(i => i.title?.trim())
    if (!valid.length) { res.json({ inserted: 0 }); return }
    let inserted = 0
    for (const i of valid) {
      await pool.query(
        `INSERT INTO language_scenarios (user_id, title, content, source_lang, target_lang)
         VALUES ($1,$2,$3,$4,$5)`,
        [uid, i.title.trim(), i.content?.trim() || '', i.source_lang ?? 'de', i.target_lang ?? 'tr']
      )
      inserted++
    }
    res.json({ inserted })
  })

  router.post('/language/scenarios', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title = 'Untitled', content = '', source_lang = 'de', target_lang = 'tr',
            memory_palace = null } = req.body as Record<string, unknown>
    const { rows } = await pool.query(
      `INSERT INTO language_scenarios
         (user_id, title, content, source_lang, target_lang, memory_palace)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uid, title, content, source_lang, target_lang, memory_palace]
    )
    res.json(rows[0])
  })

  router.put('/language/scenarios/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { title, content, source_lang, target_lang, word_links = [],
            memory_palace = null } = req.body as Record<string, unknown>
    const { rows } = await pool.query(
      `UPDATE language_scenarios
       SET title=$1, content=$2, source_lang=$3, target_lang=$4,
           word_links=$5, memory_palace=$6, updated_at=now()
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [title, content, source_lang, target_lang,
       JSON.stringify(word_links), memory_palace, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.post('/language/scenarios/:id/review', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const quality = Number((req.body as { quality: number }).quality)
    const { rows } = await pool.query('SELECT * FROM language_scenarios WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    if (!rows[0]) { res.status(404).json({ error: 'not found' }); return }
    const { interval, repetitions, ease_factor } = rows[0] as { interval: number; repetitions: number; ease_factor: string }
    const sr = sm2(interval, repetitions, Number(ease_factor), quality)
    const { rows: updated } = await pool.query(
      'UPDATE language_scenarios SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [sr.interval, sr.repetitions, sr.easeFactor, sr.dueAt, req.params.id, uid]
    )
    res.json(updated[0])
  })

  router.delete('/language/scenarios/:id', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    await pool.query('DELETE FROM language_scenarios WHERE id=$1 AND user_id=$2', [req.params.id, uid])
    res.json({ ok: true })
  })

  router.patch('/language/scenarios/folder-rename', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { oldPath, newPath } = req.body as { oldPath: string; newPath: string }
    if (!oldPath?.trim() || !newPath?.trim()) { res.status(400).json({ error: 'oldPath and newPath required' }); return }
    await pool.query(
      `UPDATE language_scenarios SET folder = CASE WHEN folder = $1 THEN $2 ELSE $2 || SUBSTRING(folder FROM LENGTH($1) + 1) END
       WHERE user_id = $3 AND (folder = $1 OR folder LIKE $4)`,
      [oldPath, newPath, uid, oldPath + '/%']
    )
    res.json({ ok: true })
  })

  router.patch('/language/scenarios/:id/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { folder } = req.body as { folder: string | null }
    const { rows } = await pool.query(
      'UPDATE language_scenarios SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder ?? null, req.params.id, uid]
    )
    res.json(rows[0] ?? null)
  })

  router.delete('/language/scenarios/folder', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { path } = req.query as { path: string }
    if (!path?.trim()) { res.status(400).json({ error: 'path required' }); return }
    await pool.query(
      `DELETE FROM language_scenarios WHERE user_id = $1 AND (folder = $2 OR folder LIKE $3)`,
      [uid, path, path + '/%']
    )
    res.json({ ok: true })
  })

  // ─── Reminders (all — including done) ────────────────────────────────────────

  router.get('/reminders', async (req: Request, res: Response) => {
    const uid = (req.user as Express.User).id
    const { rows } = await pool.query(
      'SELECT * FROM reminders WHERE user_id = $1 ORDER BY done ASC, due_at NULLS LAST, created_at DESC',
      [uid]
    )
    res.json(rows)
  })

  return router
}
