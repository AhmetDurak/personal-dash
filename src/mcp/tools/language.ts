import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function uidOf(req: Request): number {
  return (req.user as Express.User).id
}

// SM-2 spaced-repetition scheduling, shared by vocabulary/sentences/scenarios review tools
// (mirrors the logic in src/api/routes/notebook.ts).
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

const qualitySchema = z.number().int().min(0).max(5).describe('Recall quality 0-5 (SM-2 scale): 0 = total blackout, 5 = perfect recall')

// Read+write tools mirroring src/api/routes/notebook.ts's Vocabulary/Sentences/Scenarios endpoints.
// Bulk-import and folder-administration endpoints are intentionally not exposed — this covers
// the day-to-day "add/list/edit/delete/review a card" operations an assistant is actually asked for.
export function registerLanguageTools(server: McpServer, req: Request, pool: Pool) {
  // ─── Vocabulary ─────────────────────────────────────────────────────────────

  server.registerTool('language_vocab_list', {
    title: 'List vocabulary',
    description: 'List vocabulary flashcards, newest first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM vocabulary WHERE user_id = $1 ORDER BY created_at DESC', [uid])
    return json(rows)
  })

  server.registerTool('language_vocab_add', {
    title: 'Add a vocabulary word',
    description: 'Add (or update, if the word already exists) a vocabulary flashcard.',
    inputSchema: {
      word: z.string(),
      translation: z.string(),
      language: z.string().optional().describe('Source language code, default "de"'),
      translation_language: z.string().optional().describe('Translation language code, default "tr"'),
      example: z.string().optional(),
    },
  }, async ({ word, translation, language, translation_language, example }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `INSERT INTO vocabulary (word, translation, language, translation_language, example, user_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (LOWER(word), language, user_id) DO UPDATE
         SET translation=EXCLUDED.translation, translation_language=EXCLUDED.translation_language, example=EXCLUDED.example
       RETURNING *`,
      [word.trim(), translation.trim(), language ?? 'de', translation_language ?? 'tr', example ?? null, uid]
    )
    return json(rows[0])
  })

  server.registerTool('language_vocab_update', {
    title: 'Update a vocabulary word',
    description: 'Edit an existing vocabulary flashcard.',
    inputSchema: {
      id: z.number().int(),
      word: z.string(),
      translation: z.string(),
      language: z.string(),
      translation_language: z.string().optional(),
      example: z.string().optional(),
    },
  }, async ({ id, word, translation, language, translation_language, example }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE vocabulary SET word=$1, translation=$2, language=$3, translation_language=$4, example=$5 WHERE id=$6 AND user_id=$7 RETURNING *',
      [word, translation, language, translation_language ?? 'tr', example ?? null, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('language_vocab_delete', {
    title: 'Delete a vocabulary word',
    description: 'Permanently delete a vocabulary flashcard.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM vocabulary WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })

  server.registerTool('language_vocab_review', {
    title: 'Review a vocabulary word',
    description: 'Record a spaced-repetition review for a vocabulary flashcard and schedule its next due date.',
    inputSchema: { id: z.number().int(), quality: qualitySchema },
  }, async ({ id, quality }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM vocabulary WHERE id=$1 AND user_id=$2', [id, uid])
    if (!rows[0]) return json(null)
    const row = rows[0] as { interval: number; repetitions: number; ease_factor: string }
    const sr = sm2(row.interval, row.repetitions, Number(row.ease_factor), quality)
    const { rows: updated } = await pool.query(
      'UPDATE vocabulary SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [sr.interval, sr.repetitions, sr.easeFactor, sr.dueAt, id, uid]
    )
    return json(updated[0])
  })

  // ─── Sentences ──────────────────────────────────────────────────────────────

  server.registerTool('language_sentence_list', {
    title: 'List language sentences',
    description: 'List language-learning sentences, due-soonest first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM language_sentences WHERE user_id=$1 ORDER BY due_at ASC, updated_at DESC', [uid])
    return json(rows)
  })

  server.registerTool('language_sentence_add', {
    title: 'Add a language sentence',
    description: 'Add a new sentence for language practice.',
    inputSchema: {
      source_text: z.string(),
      translation: z.string().optional(),
      source_lang: z.string().optional().describe('Default "de"'),
      target_lang: z.string().optional().describe('Default "tr"'),
    },
  }, async ({ source_text, translation, source_lang, target_lang }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `INSERT INTO language_sentences (user_id, source_text, translation, source_lang, target_lang)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [uid, source_text, translation ?? null, source_lang ?? 'de', target_lang ?? 'tr']
    )
    return json(rows[0])
  })

  server.registerTool('language_sentence_update', {
    title: 'Update a language sentence',
    description: 'Edit an existing sentence.',
    inputSchema: {
      id: z.number().int(),
      source_text: z.string(),
      translation: z.string().optional(),
      source_lang: z.string(),
      target_lang: z.string(),
    },
  }, async ({ id, source_text, translation, source_lang, target_lang }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `UPDATE language_sentences SET source_text=$1, translation=$2, source_lang=$3, target_lang=$4, updated_at=now()
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [source_text, translation ?? null, source_lang, target_lang, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('language_sentence_delete', {
    title: 'Delete a language sentence',
    description: 'Permanently delete a sentence.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM language_sentences WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })

  server.registerTool('language_sentence_review', {
    title: 'Review a language sentence',
    description: 'Record a spaced-repetition review for a sentence and schedule its next due date.',
    inputSchema: { id: z.number().int(), quality: qualitySchema },
  }, async ({ id, quality }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM language_sentences WHERE id=$1 AND user_id=$2', [id, uid])
    if (!rows[0]) return json(null)
    const row = rows[0] as { interval: number; repetitions: number; ease_factor: string }
    const sr = sm2(row.interval, row.repetitions, Number(row.ease_factor), quality)
    const { rows: updated } = await pool.query(
      'UPDATE language_sentences SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [sr.interval, sr.repetitions, sr.easeFactor, sr.dueAt, id, uid]
    )
    return json(updated[0])
  })

  // ─── Scenarios ──────────────────────────────────────────────────────────────

  server.registerTool('language_scenario_list', {
    title: 'List language scenarios',
    description: 'List language-learning scenarios, due-soonest first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM language_scenarios WHERE user_id=$1 ORDER BY due_at ASC, updated_at DESC', [uid])
    return json(rows)
  })

  server.registerTool('language_scenario_add', {
    title: 'Add a language scenario',
    description: 'Add a new practice scenario (e.g. a dialogue or situational script).',
    inputSchema: {
      title: z.string().optional().describe('Defaults to "Untitled"'),
      content: z.string().optional(),
      source_lang: z.string().optional().describe('Default "de"'),
      target_lang: z.string().optional().describe('Default "tr"'),
    },
  }, async ({ title, content, source_lang, target_lang }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `INSERT INTO language_scenarios (user_id, title, content, source_lang, target_lang)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [uid, title ?? 'Untitled', content ?? '', source_lang ?? 'de', target_lang ?? 'tr']
    )
    return json(rows[0])
  })

  server.registerTool('language_scenario_update', {
    title: 'Update a language scenario',
    description: 'Edit an existing scenario.',
    inputSchema: {
      id: z.number().int(),
      title: z.string(),
      content: z.string(),
      source_lang: z.string(),
      target_lang: z.string(),
    },
  }, async ({ id, title, content, source_lang, target_lang }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `UPDATE language_scenarios SET title=$1, content=$2, source_lang=$3, target_lang=$4, updated_at=now()
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [title, content, source_lang, target_lang, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('language_scenario_delete', {
    title: 'Delete a language scenario',
    description: 'Permanently delete a scenario.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM language_scenarios WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })

  server.registerTool('language_scenario_review', {
    title: 'Review a language scenario',
    description: 'Record a spaced-repetition review for a scenario and schedule its next due date.',
    inputSchema: { id: z.number().int(), quality: qualitySchema },
  }, async ({ id, quality }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM language_scenarios WHERE id=$1 AND user_id=$2', [id, uid])
    if (!rows[0]) return json(null)
    const row = rows[0] as { interval: number; repetitions: number; ease_factor: string }
    const sr = sm2(row.interval, row.repetitions, Number(row.ease_factor), quality)
    const { rows: updated } = await pool.query(
      'UPDATE language_scenarios SET interval=$1, repetitions=$2, ease_factor=$3, due_at=$4 WHERE id=$5 AND user_id=$6 RETURNING *',
      [sr.interval, sr.repetitions, sr.easeFactor, sr.dueAt, id, uid]
    )
    return json(updated[0])
  })
}
