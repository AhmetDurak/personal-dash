export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.DB_CLIENT_ID!,
    response_type: 'code',
    scope: 'read_accounts read_transactions',
    redirect_uri: process.env.DB_REDIRECT_URI!,
  })
  return `${process.env.DB_API_BASE ?? 'https://simulator-api.db.com/gw'}/oidc/authorize?${params}`
}
