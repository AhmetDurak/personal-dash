import { Pool } from 'pg'

export interface McpOAuthClient {
  client_id: string
  client_name: string | null
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  token_endpoint_auth_method: string
}

export async function registerClient(
  pool: Pool,
  params: { clientName?: string; redirectUris: string[] }
): Promise<McpOAuthClient> {
  const { rows } = await pool.query(
    `INSERT INTO mcp_oauth_clients (client_name, redirect_uris)
     VALUES ($1, $2)
     RETURNING client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method`,
    [params.clientName ?? null, params.redirectUris]
  )
  return rows[0] as McpOAuthClient
}

export async function findClient(pool: Pool, clientId: string): Promise<McpOAuthClient | null> {
  const { rows } = await pool.query(
    `SELECT client_id, client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method
     FROM mcp_oauth_clients WHERE client_id = $1`,
    [clientId]
  )
  return (rows[0] as McpOAuthClient) ?? null
}
