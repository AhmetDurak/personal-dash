import { Category } from '../../types'

export const CODE_MAP: Record<string, Category> = {
  'PMNT.RCDT.XBCT': 'Income',
  'PMNT.RCDT.ESCT': 'Income',
  'PMNT.CCRD.POSD': 'Market',
  'PMNT.DBTRF.ESCT': 'Fixed',
  'SECU.SETT.COLL': 'Investment',
  'PMNT.ICDT.XBCT': 'Others',
}

export const NAME_RULES: Array<[RegExp, Category]> = [
  [/gehalt|lohn|salary|payroll/i, 'Income'],
  [/rewe|aldi|edeka|lidl|penny|netto|kaufland/i, 'Market'],
  [/apotheke|kranken|arzt|zahnarzt|physio|hospital/i, 'Health'],
  [/netflix|spotify|kino|prime|disney|theater/i, 'Entertainment'],
  [/udemy|coursera|linkedin learning|bücher|buch/i, 'Education'],
  [/allianz|huk|versicherung|aok|tk |barmer/i, 'Fixed'],
  [/miete|warmmiete|nebenkosten|wohnung/i, 'Fixed'],
  [/dws|comdirect|etf|sparplan|depot|trade republic/i, 'Investment'],
]
