/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        xero: {
          // All xero-* colors use CSS variables so they update with the theme.
          // Tailwind opacity syntax (<alpha-value>) is preserved for /5, /10, etc. variants.
          green:        'rgb(var(--clr-accent)      / <alpha-value>)',
          'green-dark': 'rgb(var(--clr-accent-dark) / <alpha-value>)',
          navy:         'rgb(var(--clr-sidebar)     / <alpha-value>)',
          'navy-light': 'rgb(var(--clr-sidebar-h)   / <alpha-value>)',
          bg:           'rgb(var(--clr-page-bg)     / <alpha-value>)',
          border:       'rgb(var(--clr-border)      / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
