/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'translate-x-0',
    '-translate-x-full',
    'lg:translate-x-0',
    'lg:static',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
