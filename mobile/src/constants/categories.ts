import type { Category } from '../types'

export const CAT_COLORS: Record<Category, string> = {
  Einkommen:            '#00B087',
  Lebenshaltung:        '#378ADD',
  Wohnen:               '#888780',
  Mobilität:            '#E07B39',
  'Freizeit und Reise': '#D4537E',
  'Beruf und Bildung':  '#BA7517',
  Gesundheit:           '#D85A30',
  Kinder:               '#6EBF9E',
  'Sparen und Anlagen': '#534AB7',
  Versicherungen:       '#5B8DB8',
  Kredite:              '#C05B5B',
  Sonstige:             '#3B6D11',
}

export const CAT_ICONS: Record<Category, string> = {
  Einkommen:            '💰',
  Lebenshaltung:        '🛒',
  Wohnen:               '🏠',
  Mobilität:            '🚗',
  'Freizeit und Reise': '🎬',
  'Beruf und Bildung':  '📚',
  Gesundheit:           '🏥',
  Kinder:               '👶',
  'Sparen und Anlagen': '📈',
  Versicherungen:       '🛡️',
  Kredite:              '🏦',
  Sonstige:             '📦',
}
