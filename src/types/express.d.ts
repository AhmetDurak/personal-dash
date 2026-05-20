declare namespace Express {
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
  }
}
