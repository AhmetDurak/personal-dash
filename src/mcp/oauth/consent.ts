import { Pool } from 'pg'

export async function upsertConsent(pool: Pool, params: { userId: number; clientId: string; grantedScope: string }): Promise<void> {
  await pool.query(
    `INSERT INTO mcp_consents (user_id, client_id, granted_scope)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, client_id) DO UPDATE
       SET granted_scope = EXCLUDED.granted_scope, updated_at = now(), revoked_at = NULL`,
    [params.userId, params.clientId, params.grantedScope]
  )
}
