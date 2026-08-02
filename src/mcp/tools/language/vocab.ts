import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { json, uidOf, sm2, qualitySchema } from './shared'

export function registerVocabTools(server: McpServer, req: Request, pool: Pool) {
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
    description: 'Add (or update, if the word already exists) a vocabulary flashcard, optionally inside a folder.',
    inputSchema: {
      word: z.string(),
      translation: z.string(),
      language: z.string().optional().describe('Source language code, default "de"'),
      translation_language: z.string().optional().describe('Translation language code, default "tr"'),
      example: z.string().optional(),
      folder: z.string().nullable().optional().describe('Folder path, e.g. "Travel/Food". Omit or null for the root folder.'),
    },
  }, async ({ word, translation, language, translation_language, example, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `INSERT INTO vocabulary (word, translation, language, translation_language, example, folder, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (LOWER(word), language, user_id) DO UPDATE
         SET translation=EXCLUDED.translation, translation_language=EXCLUDED.translation_language, example=EXCLUDED.example
       RETURNING *`,
      [word.trim(), translation.trim(), language ?? 'de', translation_language ?? 'tr', example ?? null, folder ?? null, uid]
    )
    return json(rows[0])
  })

  server.registerTool('language_vocab_bulk_add', {
    title: 'Add multiple vocabulary words',
    description: 'Add (or update, for words that already exist) several vocabulary flashcards in one call, each optionally inside a folder.',
    inputSchema: {
      words: z.array(z.object({
        word: z.string(),
        translation: z.string(),
        language: z.string().optional().describe('Source language code, default "de"'),
        translation_language: z.string().optional().describe('Translation language code, default "tr"'),
        example: z.string().optional(),
        folder: z.string().nullable().optional().describe('Folder path, e.g. "Travel/Food". Omit or null for the root folder.'),
      })).min(1),
    },
  }, async ({ words }) => {
    const uid = uidOf(req)
    const created = []
    for (const w of words) {
      const { rows } = await pool.query(
        `INSERT INTO vocabulary (word, translation, language, translation_language, example, folder, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (LOWER(word), language, user_id) DO UPDATE
           SET translation=EXCLUDED.translation, translation_language=EXCLUDED.translation_language, example=EXCLUDED.example
         RETURNING *`,
        [w.word.trim(), w.translation.trim(), w.language ?? 'de', w.translation_language ?? 'tr', w.example ?? null, w.folder ?? null, uid]
      )
      created.push(rows[0])
    }
    return json(created)
  })

  server.registerTool('language_vocab_move_folder', {
    title: 'Move a vocabulary word to a folder',
    description: 'Move a vocabulary flashcard into a different folder (or to the root by passing null).',
    inputSchema: {
      id: z.number().int(),
      folder: z.string().nullable().describe('Destination folder path, or null for the root folder'),
    },
  }, async ({ id, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE vocabulary SET folder=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('language_vocab_list_folders', {
    title: 'List vocabulary folders',
    description: 'List the distinct folder paths currently in use, so a new or moved word can be filed into an existing folder instead of creating a near-duplicate one.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'SELECT DISTINCT folder FROM vocabulary WHERE user_id = $1 AND folder IS NOT NULL ORDER BY folder',
      [uid]
    )
    return json(rows.map(r => r.folder as string))
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
}
