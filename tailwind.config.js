/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          950: '#07080a',
          900: '#0c0e12',
          850: '#11141a',
          800: '#161a23',
          700: '#222836',
          600: '#333b4f',
          500: '#54607b',
          400: '#8c98b2',
          300: '#cbd3e1',
          100: '#f1f4f9',
        },
        bid: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.25)',
          muted: '#064e3b',
        },
        ask: {
          DEFAULT: '#f43f5e',
          glow: 'rgba(244, 63, 94, 0.25)',
          muted: '#881337',
        },
        volt: {
          DEFAULT: '#00f59b',
          glow: 'rgba(0, 245, 155, 0.25)',
        },
        gold: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.25)',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tick-flash-green': 'flashGreen 0.4s ease-out',
        'tick-flash-red': 'flashRed 0.4s ease-out',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(244, 63, 94, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};
