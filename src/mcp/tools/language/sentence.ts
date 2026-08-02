import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { json, uidOf, sm2, qualitySchema } from './shared'

export function registerSentenceTools(server: McpServer, req: Request, pool: Pool) {
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
    description: 'Add a new sentence for language practice, optionally inside a folder.',
    inputSchema: {
      source_text: z.string(),
      translation: z.string().optional(),
      source_lang: z.string().optional().describe('Default "de"'),
      target_lang: z.string().optional().describe('Default "tr"'),
      folder: z.string().nullable().optional().describe('Folder path, e.g. "Travel/Restaurants". Omit or null for the root folder.'),
      due_at: z.string().date().optional().describe('First review date, YYYY-MM-DD. Omit for today.'),
    },
  }, async ({ source_text, translation, source_lang, target_lang, folder, due_at }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `INSERT INTO language_sentences (user_id, source_text, translation, source_lang, target_lang, folder, due_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, CURRENT_DATE)) RETURNING *`,
      [uid, source_text, translation ?? null, source_lang ?? 'de', target_lang ?? 'tr', folder ?? null, due_at ?? null]
    )
    return json(rows[0])
  })

  server.registerTool('language_sentence_move_folder', {
    title: 'Move a sentence to a folder',
    description: 'Move a sentence into a different folder (or to the root by passing null).',
    inputSchema: {
      id: z.number().int(),
      folder: z.string().nullable().describe('Destination folder path, or null for the root folder'),
    },
  }, async ({ id, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE language_sentences SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('language_sentence_list_folders', {
    title: 'List sentence folders',
    description: 'List the distinct folder paths currently in use, so a new or moved sentence can be filed into an existing folder instead of creating a near-duplicate one.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'SELECT DISTINCT folder FROM language_sentences WHERE user_id = $1 AND folder IS NOT NULL ORDER BY folder',
      [uid]
    )
    return json(rows.map(r => r.folder as string))
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
}
