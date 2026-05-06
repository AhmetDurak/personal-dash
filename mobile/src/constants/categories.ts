import type { Category } from '../types'

export const CAT_COLORS: Record<Category, string> = {
  Fixed: '#888780', Market: '#378ADD', Health: '#D85A30',
  Investment: '#534AB7', Education: '#BA7517', Entertainment: '#D4537E',
  Others: '#3B6D11', Income: '#1D9E75',
}
export const CAT_ICONS: Record<Category, string> = {
  Income: '💰', Fixed: '🏠', Market: '🛒', Health: '🏥',
  Investment: '📈', Education: '📚', Entertainment: '🎬', Others: '📦',
}
