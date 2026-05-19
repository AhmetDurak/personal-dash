import type { Category } from '../types'

export const CAT_COLORS: Record<Category, string> = {
  Income:            '#1D9E75',
  Salary:            '#00B087',
  Freelance:         '#059669',
  'Investment Income':'#0EA5E9',
  'Other Income':    '#6EE7B7',
  Fixed:             '#888780',
  Market:            '#378ADD',
  Health:            '#D85A30',
  Investment:        '#534AB7',
  Education:         '#BA7517',
  Entertainment:     '#D4537E',
  Others:            '#3B6D11',
}

export const CAT_ICONS: Record<Category, string> = {
  Income:            '💰',
  Salary:            '💼',
  Freelance:         '💻',
  'Investment Income':'💹',
  'Other Income':    '💵',
  Fixed:             '🏠',
  Market:            '🛒',
  Health:            '🏥',
  Investment:        '📈',
  Education:         '📚',
  Entertainment:     '🎬',
  Others:            '📦',
}
