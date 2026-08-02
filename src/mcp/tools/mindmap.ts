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

const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  back: z.string().optional(),
  parentId: z.string().nullable(),
  x: z.number().optional(),
  y: z.number().optional(),
})

const edgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  bidirectional: z.boolean().optional(),
  fromSide: z.enum(['left', 'right']).optional(),
  toSide: z.enum(['left', 'right']).optional(),
})

// Read+write tools mirroring src/api/routes/notebook.ts's Mindmap endpoints.
export function registerMindmapTools(server: McpServer, req: Request, pool: Pool) {
  server.registerTool('mindmap_list', {
    title: 'List mindmaps',
    description: 'List mindmaps (title/folder only — use mindmap_get for the full node/edge graph), most recently updated first.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'SELECT id, title, folder, created_at, updated_at FROM mindmaps WHERE user_id = $1 ORDER BY updated_at DESC',
      [uid]
    )
    return json(rows)
  })

  server.registerTool('mindmap_list_folders', {
    title: 'List mindmap folders',
    description: 'List the distinct folder paths currently in use, so a new or moved mindmap can be filed into an existing folder instead of creating a near-duplicate one.',
    inputSchema: {},
  }, async () => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'SELECT DISTINCT folder FROM mindmaps WHERE user_id = $1 AND folder IS NOT NULL ORDER BY folder',
      [uid]
    )
    return json(rows.map(r => r.folder as string))
  })

  server.registerTool('mindmap_get', {
    title: 'Get a mindmap',
    description: 'Get a single mindmap including its full nodes and edges.',
    inputSchema: { id: z.number().int().describe('Mindmap id') },
  }, async ({ id }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query('SELECT * FROM mindmaps WHERE id=$1 AND user_id=$2', [id, uid])
    return json(rows[0] ?? null)
  })

  server.registerTool('mindmap_create', {
    title: 'Create a mindmap',
    description: 'Create a new mindmap, optionally with initial nodes/edges and a folder.',
    inputSchema: {
      title: z.string().optional().describe('Defaults to "New Map"'),
      nodes: z.array(nodeSchema).optional(),
      edges: z.array(edgeSchema).optional(),
      folder: z.string().nullable().optional(),
    },
  }, async ({ title, nodes, edges, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'INSERT INTO mindmaps (title, nodes, edges, folder, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title ?? 'New Map', JSON.stringify(nodes ?? []), JSON.stringify(edges ?? []), folder ?? null, uid]
    )
    return json(rows[0])
  })

  server.registerTool('mindmap_update', {
    title: 'Update a mindmap',
    description: 'Replace the title, nodes, and edges of an existing mindmap.',
    inputSchema: {
      id: z.number().int(),
      title: z.string(),
      nodes: z.array(nodeSchema),
      edges: z.array(edgeSchema).optional(),
    },
  }, async ({ id, title, nodes, edges }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE mindmaps SET title=$1, nodes=$2, edges=$3, updated_at=now() WHERE id=$4 AND user_id=$5 RETURNING *',
      [title, JSON.stringify(nodes), JSON.stringify(edges ?? []), id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('mindmap_move_folder', {
    title: 'Move a mindmap to a folder',
    description: 'Move a mindmap into a different folder (or to the root by passing null).',
    inputSchema: {
      id: z.number().int(),
      folder: z.string().nullable().describe('Destination folder path, or null for the root folder'),
    },
  }, async ({ id, folder }) => {
    const uid = uidOf(req)
    const { rows } = await pool.query(
      'UPDATE mindmaps SET folder=$1, updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id, title, folder, created_at, updated_at',
      [folder, id, uid]
    )
    return json(rows[0] ?? null)
  })

  server.registerTool('mindmap_delete', {
    title: 'Delete a mindmap',
    description: 'Permanently delete a mindmap.',
    inputSchema: { id: z.number().int() },
  }, async ({ id }) => {
    const uid = uidOf(req)
    await pool.query('DELETE FROM mindmaps WHERE id=$1 AND user_id=$2', [id, uid])
    return json({ ok: true })
  })
}
