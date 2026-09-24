/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './app.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        slate: {
          50: '#F8F8F9',
          100: '#f1f1f5',
          200: '#e1e1ea',
          300: '#c5c5d3',
          400: '#9d9db2',
          500: '#75758d',
          600: '#5c5c72',
          700: '#4a4a5d',
          800: '#1D2142',
          850: '#13162C',
          900: '#0E1020',
          950: '#090A14',
        },
        accent: {
          50: '#fff0f4',
          100: '#ffe0e9',
          200: '#ffc0d3',
          300: '#ff8fab',
          400: '#f5507e',
          500: '#E1306C',
          600: '#c41f58',
          700: '#a01447',
          800: '#7d1039',
          900: '#5a0d2a',
          950: '#3a0819',
        },
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
