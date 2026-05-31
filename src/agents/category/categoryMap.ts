import { Category } from '../../types'

export const CODE_MAP: Record<string, Category> = {
  'PMNT.RCDT.XBCT': 'Einkommen',
  'PMNT.RCDT.ESCT': 'Einkommen',
  'PMNT.CCRD.POSD': 'Lebenshaltung',
  'PMNT.DBTRF.ESCT': 'Wohnen',
  'SECU.SETT.COLL': 'Sparen und Anlagen',
  'PMNT.ICDT.XBCT': 'Sonstige',
}

export const NAME_RULES: Array<[RegExp, Category]> = [
  [/gehalt|lohn|salary|payroll/i,                          'Einkommen'],
  [/rewe|aldi|edeka|lidl|penny|netto|kaufland|dm |rossmann/i, 'Lebenshaltung'],
  [/apotheke|kranken|arzt|zahnarzt|physio|hospital/i,      'Gesundheit'],
  [/netflix|spotify|kino|prime|disney|theater|hbo/i,       'Freizeit und Reise'],
  [/udemy|coursera|linkedin learning|bücher|buch/i,        'Beruf und Bildung'],
  [/allianz|huk|versicherung|aok|barmer|signal iduna/i,    'Versicherungen'],
  [/miete|warmmiete|nebenkosten|wohnung|hausgeld/i,        'Wohnen'],
  [/strom|gas|wasser|energie|enb w|stadtwerke/i,           'Wohnen'],
  [/dws|comdirect|etf|sparplan|depot|trade republic|scalable/i, 'Sparen und Anlagen'],
  [/shell|aral|bp |esso|total|tankstelle/i,                'Mobilität'],
  [/uber|lyft|taxi|bvg|mvv|rnv|db bahn|deutschebahn/i,    'Mobilität'],
  [/restaurant|cafe|bar |mcdonald|burger|pizza|sushi/i,    'Freizeit und Reise'],
  [/kredit|darlehen|finanzierung|rate /i,                  'Kredite'],
  [/steuer|finanzamt|gebühr/i,                             'Sonstige'],
]
