export interface OAuthToken {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface BankAccount {
  iban: string
  productDescription: string
  currentBalance: number
}

export interface RawTransaction {
  bookingDate: string
  valueDate: string
  paymentReference: string
  counterPartyName: string
  amount: number
  currencyCode: string
  transactionCode: string
}

export class BankError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'BankError'
  }
}
