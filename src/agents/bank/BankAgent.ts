import axios, { AxiosError } from 'axios'
import { OAuthToken, BankAccount, RawTransaction, BankError } from './types'

const BASE = (process.env.DB_API_BASE ?? 'https://simulator-api.db.com').replace(/\/gw\/?$/, '') + '/gw'

export class BankAgent {
  async getToken(code: string, codeVerifier?: string): Promise<OAuthToken> {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: process.env.DB_CLIENT_ID!,
      redirect_uri: process.env.DB_REDIRECT_URI!,
    }
    if (codeVerifier) {
      body.code_verifier = codeVerifier
    } else {
      body.client_secret = process.env.DB_CLIENT_SECRET!
    }
    return this.post<OAuthToken>('/oidc/token', new URLSearchParams(body))
  }

  async refreshToken(refresh: string): Promise<OAuthToken> {
    return this.post<OAuthToken>('/oidc/token', new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: process.env.DB_CLIENT_ID!,
      client_secret: process.env.DB_CLIENT_SECRET!,
    }))
  }

  async getAccounts(token: string): Promise<BankAccount[]> {
    const { data } = await this.get<{ accounts: BankAccount[] }>(
      '/dbapi/banking/cashAccounts/v2',
      token
    )
    return data.accounts
  }

  async getTransactions(
    token: string,
    iban: string,
    from: string,
    to: string
  ): Promise<RawTransaction[]> {
    const { data } = await this.get<{ transactions: RawTransaction[] }>(
      '/dbapi/banking/transactions/v2',
      token,
      { iban, bookingDateFrom: from, bookingDateTo: to }
    )
    return data.transactions
  }

  private async post<T>(path: string, body: URLSearchParams): Promise<T> {
    try {
      const { data } = await axios.post<T>(`${BASE}${path}`, body)
      return data
    } catch (err) {
      throw this.wrap(err as AxiosError)
    }
  }

  private async get<T>(path: string, token: string, params?: Record<string, string>) {
    try {
      return await axios.get<T>(`${BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })
    } catch (err) {
      const axiosErr = err as AxiosError
      if (axiosErr.response?.status === 401) {
        throw new BankError(401, 'Token expired — refresh required')
      }
      if (axiosErr.response?.status === 403) {
        throw new BankError(403, 'Consent expired — re-authenticate')
      }
      throw this.wrap(axiosErr)
    }
  }

  private wrap(err: AxiosError): BankError {
    const status = err.response?.status ?? 0
    const message = (err.response?.data as Record<string, string>)?.message ?? err.message
    return new BankError(status, message)
  }
}
