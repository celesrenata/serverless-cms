/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
          secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
          background: 'rgb(var(--color-background) / <alpha-value>)',
          'background-alt': 'rgb(var(--color-background-alt) / <alpha-value>)',
          surface: 'rgb(var(--color-surface) / <alpha-value>)',
          'surface-alt': 'rgb(var(--color-surface-alt) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
          'text-inverse': 'rgb(var(--color-text-inverse) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          'border-light': 'rgb(var(--color-border-light) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          success: 'rgb(var(--color-success) / <alpha-value>)',
          warning: 'rgb(var(--color-warning) / <alpha-value>)',
          error: 'rgb(var(--color-error) / <alpha-value>)',
          info: 'rgb(var(--color-info) / <alpha-value>)',
        }
      }
    }
  },
  plugins: [],
}
