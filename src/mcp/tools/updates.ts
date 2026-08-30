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

// Read+write tools mirroring src/api/routes/publications.ts — lets a scheduled/
// automated Claude task publish directly into the user's Updates feed.
export function registerUpdatesTools(server: McpServer, req: Request, pool: Pool) {
  server.registerTool('updates_list', {
    title: 'List updates',
    description: 'List published updates (news, improvements, etc.) in the Updates feed, newest first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'SELECT * FROM publications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
      [uid]
    )
    return json(rows)
  })

  server.registerTool('updates_publish', {
    title: 'Publish an update',
    description: 'Publish a new item to the Updates feed — e.g. a news write-up or an improvement summary from a scheduled task. Shows up in the dashboard\'s Updates tab with an unread badge.',
    inputSchema: {
      title: z.string().describe('Short headline'),
      body: z.string().optional().describe('Longer text content'),
      type: z.string().optional().describe('e.g. "news" or "improvement" — free text, defaults to "news"'),
      link: z.string().optional().describe('Optional source or reference URL'),
    },
  }, async ({ title, body, type, link }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'INSERT INTO publications (title, body, type, link, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title.trim(), body ?? '', type?.trim() || 'news', link ?? null, uid]
    )
    return json(rows[0])
  })

  server.registerTool('updates_mark_read', {
    title: 'Mark an update read/unread',
    description: 'Set the read state of a published update.',
    inputSchema: {
      id: z.number().int().describe('Update id'),
      read: z.boolean().describe('true = read, false = unread'),
    },
  }, async ({ id, read }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE publications SET read = $3 WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, uid, read]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('updates_delete', {
    title: 'Delete an update',
    description: 'Permanently delete a published update.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM publications WHERE id = $1 AND user_id = $2', [id, uid])
    return json({ ok: true })
  })
}
