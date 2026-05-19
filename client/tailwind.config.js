/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        xero: {
          green:       '#00B087',
          'green-dark':'#008A6A',
          navy:        '#1E2B4A',
          'navy-light':'#2D3E63',
          bg:          '#F5F6FA',
          border:      '#E8EBF0',
        },
      },
    },
  },
  plugins: [],
}
