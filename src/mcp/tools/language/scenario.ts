import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { json, uidOf, sm2, qualitySchema } from './shared'

export function registerScenarioTools(server: McpServer, req: Request, pool: Pool) {
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
    description: 'Add a new practice scenario (e.g. a dialogue or situational script), optionally inside a folder.',
    inputSchema: {
      title: z.string().optional().describe('Defaults to "Untitled"'),
      content: z.string().optional(),
      source_lang: z.string().optional().describe('Default "de"'),
      target_lang: z.string().optional().describe('Default "tr"'),
      folder: z.string().nullable().optional().describe('Folder path, e.g. "Travel/Airport". Omit or null for the root folder.'),
    },
  }, async ({ title, content, source_lang, target_lang, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `INSERT INTO language_scenarios (user_id, title, content, source_lang, target_lang, folder)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uid, title ?? 'Untitled', content ?? '', source_lang ?? 'de', target_lang ?? 'tr', folder ?? null]
    )
    return json(rows[0])
  })

  server.registerTool('language_scenario_move_folder', {
    title: 'Move a scenario to a folder',
    description: 'Move a scenario into a different folder (or to the root by passing null).',
    inputSchema: {
      id: z.number().int(),
      folder: z.string().nullable().describe('Destination folder path, or null for the root folder'),
    },
  }, async ({ id, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE language_scenarios SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('language_scenario_list_folders', {
    title: 'List scenario folders',
    description: 'List the distinct folder paths currently in use, so a new or moved scenario can be filed into an existing folder instead of creating a near-duplicate one.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'SELECT DISTINCT folder FROM language_scenarios WHERE user_id = $1 AND folder IS NOT NULL ORDER BY folder',
      [uid]
    )
    return json(rows.map(r => r.folder as string))
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
