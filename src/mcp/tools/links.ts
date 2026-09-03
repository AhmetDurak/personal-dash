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

function canonicalize(aType: string, aId: string, bType: string, bId: string) {
  const left = `${aType}:${aId}`
  const right = `${bType}:${bId}`
  return left <= right
    ? { aType, aId, bType, bId }
    : { aType: bType, aId: bId, bType: aType, bId: aId }
}

// Read+write tools mirroring src/api/routes/links.ts — lets a connected Claude
// session read a user's notes (via notes_list/notes_get) and create connections
// between them. Writes through this path are always attributed created_by='ai',
// hard-coded, so the UI can trust the badge it shows the user.
export function registerLinksTools(server: McpServer, req: Request, pool: Pool) {
  server.registerTool('links_list', {
    title: 'List connections for an item',
    description: 'List all connections (either direction) involving a given entity — e.g. entityType "note" and a note id.',
    inputSchema: {
      entityType: z.string().describe('e.g. "note"'),
      entityId: z.string(),
    },
  }, async ({ entityType, entityId }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      `SELECT * FROM links WHERE user_id = $1
       AND ((a_type = $2 AND a_id = $3) OR (b_type = $2 AND b_id = $3))
       ORDER BY created_at DESC`,
      [uid, entityType, entityId]
    )
    return json(rows)
  })

  server.registerTool('links_create', {
    title: 'Create a connection',
    description: 'Create an undirected connection between two items (e.g. two notes), optionally with a short note explaining why they\'re connected. Re-creating an existing pair is a harmless no-op.',
    inputSchema: {
      aType: z.string().describe('e.g. "note"'),
      aId: z.string(),
      bType: z.string().describe('e.g. "note"'),
      bId: z.string(),
      note: z.string().optional().describe('Short explanation of why these are connected'),
    },
  }, async ({ aType, aId, bType, bId, note }) => {
    const uid = uidOf(req)
    if (aType === bType && aId === bId) return json({ error: 'cannot link an item to itself' })

    const pair = canonicalize(aType, aId, bType, bId)
    const { rows } = await pool.query(
      `INSERT INTO links (user_id, a_type, a_id, b_type, b_id, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'ai')
       ON CONFLICT (user_id, a_type, a_id, b_type, b_id) DO NOTHING
       RETURNING *`,
      [uid, pair.aType, pair.aId, pair.bType, pair.bId, note ?? null]
    )
    if (rows[0]) return json(rows[0])
    const { rows: existing } = await pool.query(
      `SELECT * FROM links WHERE user_id=$1 AND a_type=$2 AND a_id=$3 AND b_type=$4 AND b_id=$5`,
      [uid, pair.aType, pair.aId, pair.bType, pair.bId]
    )
    return json(existing[0] ?? null)
  })

  server.registerTool('links_delete', {
    title: 'Delete a connection',
    description: 'Permanently delete a connection by its id.',
    inputSchema: { id: z.string() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM links WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })
}
