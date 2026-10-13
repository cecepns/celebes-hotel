/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        celebes: {
          red: '#E52320',
          redDark: '#C1121F',
          blue: '#1E3A8A',
          blueDark: '#172554',
          gold: '#F59E0B',
          accent: '#0284C7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
