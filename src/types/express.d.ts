export {}

declare global {
  namespace Express {
    interface User {
      id: number
      google_id: string
      email: string
      name: string
      picture: string | null
      bearer_token: string
    }
    interface Request {
      ledger: import('../agents/ledger/LedgerAgent').LedgerAgent
      etf: import('../agents/etf/ETFAgent').ETFAgent
      mcpScope?: import('../mcp/scopes').ScopeKey[]
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    mcpAuthRequest?: {
      clientId: string
      redirectUri: string
      scope: string
      state?: string
      codeChallenge: string
      codeChallengeMethod: string
      resource?: string
    }
  }
}
