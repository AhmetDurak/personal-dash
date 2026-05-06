# BankAgent

## Responsibility
Authenticate with Deutsche Bank PSD2 API and fetch raw accounts/transactions.
No categorisation, no computation — raw data only.

## Endpoints Used
```
POST https://simulator-api.db.com/gw/oidc/token          # OAuth2 token
GET  https://simulator-api.db.com/gw/dbapi/banking/v2/accounts
GET  https://simulator-api.db.com/gw/dbapi/banking/v2/transactions
  ?iban=&bookingDateFrom=YYYY-MM-DD&bookingDateTo=YYYY-MM-DD
```

## Interface
```ts
interface BankAgent {
  getToken(code: string): Promise<OAuthToken>
  refreshToken(refresh: string): Promise<OAuthToken>
  getAccounts(token: string): Promise<BankAccount[]>
  getTransactions(token: string, iban: string, from: string, to: string): Promise<RawTransaction[]>
}

interface OAuthToken { access_token: string; refresh_token: string; expires_in: number }

interface BankAccount { iban: string; productDescription: string; currentBalance: number }

interface RawTransaction {
  bookingDate: string
  valueDate: string
  paymentReference: string
  counterPartyName: string
  amount: number          // negative = debit
  currencyCode: string
  transactionCode: string // DB category code e.g. "PMNT.RCDT.XBCT"
}
```

## Implementation Sketch
```ts
// src/agents/bank/BankAgent.ts
import axios from 'axios'
import { OAuthToken, BankAccount, RawTransaction } from './types'

const BASE = 'https://simulator-api.db.com/gw'

export class BankAgent {
  async getToken(code: string): Promise<OAuthToken> {
    const { data } = await axios.post(`${BASE}/oidc/token`, new URLSearchParams({
      grant_type: 'authorization_code', code,
      client_id: process.env.DB_CLIENT_ID!,
      client_secret: process.env.DB_CLIENT_SECRET!,
      redirect_uri: process.env.DB_REDIRECT_URI!,
    }))
    return data
  }

  async getAccounts(token: string): Promise<BankAccount[]> {
    const { data } = await axios.get(`${BASE}/dbapi/banking/v2/accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return data.accounts
  }

  async getTransactions(token: string, iban: string, from: string, to: string): Promise<RawTransaction[]> {
    const { data } = await axios.get(`${BASE}/dbapi/banking/v2/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { iban, bookingDateFrom: from, bookingDateTo: to }
    })
    return data.transactions
  }
}
```

## OAuth2 Flow
```
1. Redirect user → https://simulator-api.db.com/gw/oidc/authorize
   ?client_id=&response_type=code&scope=read_accounts read_transactions
2. DB redirects back with ?code=
3. BankAgent.getToken(code) → store tokens in session (never client)
4. BankAgent.refreshToken() when expires_in < 60s
```

## Error Handling
- 401 → trigger refresh, retry once
- 403 → re-authenticate (consent expired)
- 429 → exponential backoff, max 3 retries
- All errors throw typed `BankError` with `code` and `message`

## Env Vars Required
```
DB_CLIENT_ID
DB_CLIENT_SECRET
DB_REDIRECT_URI
DB_API_BASE   # swap for production URL
```
