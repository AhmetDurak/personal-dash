export type TxType = 'income' | 'expense'

export type Category =
  | 'Einkommen'
  | 'Lebenshaltung'
  | 'Wohnen'
  | 'Mobilität'
  | 'Freizeit und Reise'
  | 'Beruf und Bildung'
  | 'Gesundheit'
  | 'Kinder'
  | 'Sparen und Anlagen'
  | 'Versicherungen'
  | 'Kredite'
  | 'Sonstige'

export const INCOME_CATS: Category[] = ['Einkommen']

export const EXPENSE_CATS: Category[] = [
  'Lebenshaltung', 'Wohnen', 'Mobilität', 'Freizeit und Reise',
  'Beruf und Bildung', 'Gesundheit', 'Kinder', 'Sparen und Anlagen',
  'Versicherungen', 'Kredite', 'Sonstige',
]

export const ALL_CATS: Category[] = [...INCOME_CATS, ...EXPENSE_CATS]

export const CATEGORY_TREE: Record<Category, string[]> = {
  Einkommen: [
    'Lohn/Gehalt', 'Bargeldeinzahlung', 'Sonderzahlungen/Tantieme',
    'Einnahmen aus Verkäufen', 'Rente / Pension', 'Staatliche Leistungen',
    'Zinsen / Dividenden / Ausschüttungen', 'Erstattungen', 'Sonstige Einnahmen',
  ],
  Lebenshaltung: [
    'Lebensmittel / Getränke', 'Kleidung / Schuhe',
    'Telefon / Internet / Fernsehen / Radio', 'Frisör / Wellness',
    'Drogerieartikel', 'Tiere', 'Kantinenkosten', 'Geschenke',
    'Sonstige Ausgaben Lebenshaltung',
  ],
  Wohnen: [
    'Miete / Nebenkosten', 'Energie & Wasser', 'Möbel / Wohnaccessoires',
    'Hausgeld', 'Haushaltshilfe', 'Grundsteuern', 'Renovierung / Instandhaltung',
    'Sonstige Ausgaben Wohnen',
  ],
  Mobilität: [
    'Auto', 'Fahrrad', 'Öffentliche Verkehrsmittel', 'Taxi', 'Tanken',
    'Sonstige Ausgaben Mobilität',
  ],
  'Freizeit und Reise': [
    'Restaurants / Cafes / Bars', 'Events / Tickets', 'Sport / Fitness',
    'Hobbys / Vereine / Verbände', 'Urlaub- / Reisekosten',
    'Bücher / Musik / Filme / Apps', 'Elektronik / Computer / Games',
    'Abonnements', 'Sonstige Ausgaben Freizeit / Reise',
  ],
  'Beruf und Bildung': [
    'Büromaterial / Lehrmaterial', 'Dienstreise / Spesen', 'Studiengebühren',
    'Weiterbildung', 'Ausbildungsförderung', 'Sonstige Ausgaben Bildung und Beruf',
  ],
  Gesundheit: [
    'Apotheke / Medikamente', 'Arztbehandlung', 'Brille / Kontaktlinsen',
    'Krankenhaus', 'Sonstige Ausgaben Gesundheit',
  ],
  Kinder: [
    'Freizeitaktivitäten / Spielwaren', 'Kinderbekleidung', 'Kinderbetreuung',
    'Schulgeld', 'Taschengeld', 'Unterhaltszahlungen', 'Kindergeld',
    'Sonstige Ausgaben Kinder',
  ],
  'Sparen und Anlagen': [
    'Altersvorsorge', 'Bausparen', 'Sparbuch & Tagesgeld', 'Wertpapieranlage',
    'Sparplan', 'Kindersparplan', 'Mieteinnahmen', 'Sonstige Anlagen',
  ],
  Versicherungen: [
    'Berufsunfähigkeitsversicherung', 'Privat-Haftpflichtversicherung',
    'Hausratversicherung', 'Krankenversicherung', 'KFZ-Versicherung',
    'Lebensversicherung', 'Wohngebäudeversicherung', 'Rentenversicherung',
    'Pflegeversicherung', 'Rechtsschutzversicherung', 'Unfallversicherung',
    'Sonstige Ausgaben Versicherung',
  ],
  Kredite: [
    'Baufinanzierung', 'Autokredit', 'Ratenkredit',
    'Studenten-/Ausbildungskredit', 'Sonstige Kredite',
  ],
  Sonstige: [
    'Spenden', 'Öffentliche Kassen / Steuer', 'Kreditkarte',
    'Internetkäufe', 'Bargeld', 'Sonstiges',
  ],
}

// Maps old category values to new ones for DB migration and graceful fallback
export const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  Income:             'Einkommen',
  Salary:             'Einkommen',
  Freelance:          'Einkommen',
  'Investment Income':'Sparen und Anlagen',
  'Other Income':     'Einkommen',
  Fixed:              'Wohnen',
  Market:             'Lebenshaltung',
  Health:             'Gesundheit',
  Investment:         'Sparen und Anlagen',
  Education:          'Beruf und Bildung',
  Entertainment:      'Freizeit und Reise',
  Others:             'Sonstige',
}

export interface Transaction {
  id: string
  date: string
  name: string
  amount: number
  type: TxType
  category: Category
  subcategory?: string | null
  source: 'bank' | 'manual'
  raw?: string
}

export interface MonthSummary {
  month: string
  income: number
  byCategory: Record<Category, number>
  totalExpenses: number
  net: number
  endBalance: number
  investmentsYTD: number
  savingsRate: number
}
