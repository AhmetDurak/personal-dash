import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Request } from 'express'
import type { Pool } from 'pg'
import { vault } from '../../api/obsidian/vaultAdapter'

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
}

function uidOf(req: Request): number {
  return (req.user as Express.User).id
}

// Read+write tools mirroring src/api/routes/notebook.ts's Notes endpoints exactly,
// including the vault.enabled() branch — when OBSIDIAN_VAULT_PATH is set, notes live
// as markdown files instead of the notebook_notes table, same as the REST API.
export function registerNotesTools(server: McpServer, req: Request, pool: Pool) {
  server.registerTool('notes_list', {
    title: 'List notes',
    description: 'List all notes, most recently updated first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    if (vault.enabled()) return json(vault.list(uid))
    const { rows } = await pool.query('SELECT * FROM notebook_notes WHERE user_id = $1 ORDER BY updated_at DESC', [uid])
    return json(rows)
  })

  server.registerTool('notes_get', {
    title: 'Get a note',
    description: 'Get a single note by id.',
    inputSchema: { id: z.string().describe('Note id') },
  }, async ({ id }) => {
    const uid = uidOf(req)
    if (vault.enabled()) return json(vault.find(id, uid)?.note ?? null)
    const { rows } = await pool.query('SELECT * FROM notebook_notes WHERE id = $1 AND user_id = $2', [id, uid])
    return json(rows[0] ?? null)
  })

  server.registerTool('notes_create', {
    title: 'Create a note',
    description: 'Create a new note, optionally inside a folder.',
    inputSchema: {
      title: z.string().optional().describe('Defaults to "Untitled"'),
      content: z.string().optional(),
      folder: z.string().nullable().optional().describe('Folder path, e.g. "Work/Ideas". Omit or null for the root folder.'),
    },
  }, async ({ title, content, folder }) => {
    const uid = uidOf(req)
    const t = title ?? 'Untitled'
    const c = content ?? ''
    const f = folder ?? null
    if (vault.enabled()) return json(vault.create(t, c, f, uid))
    const { rows } = await pool.query(
      'INSERT INTO notebook_notes (title, content, folder, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [t, c, f, uid]
    )
    return json(rows[0])
  })

  server.registerTool('notes_update', {
    title: 'Update a note',
    description: 'Replace the title and content of an existing note.',
    inputSchema: {
      id: z.string(),
      title: z.string(),
      content: z.string(),
    },
  }, async ({ id, title, content }) => {
    const uid = uidOf(req)
    if (vault.enabled()) return json(vault.update(id, title, content, uid))
    const { rows } = await pool.query(
      'UPDATE notebook_notes SET title=$1, content=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
      [title, content, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('notes_move_folder', {
    title: 'Move a note to a folder',
    description: 'Move a note into a different folder (or to the root by passing null).',
    inputSchema: {
      id: z.string(),
      folder: z.string().nullable().describe('Destination folder path, or null for the root folder'),
    },
  }, async ({ id, folder }) => {
    const uid = uidOf(req)
    if (vault.enabled()) return json(vault.updateFolder(id, folder, uid))
    const { rows } = await pool.query(
      'UPDATE notebook_notes SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING *',
      [folder, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('notes_delete', {
    title: 'Delete a note',
    description: 'Permanently delete a note.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    if (vault.enabled()) { vault.delete(id, uid); return json({ ok: true }) }
    await pool.query('DELETE FROM notebook_notes WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })
}
