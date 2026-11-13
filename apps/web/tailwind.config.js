/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#3b6bff',
          600: '#254ce0',
          700: '#1d3bb8',
          800: '#1e2e8a',
          900: '#172554',
        },
        safety: {
          red: '#dc2626',
          orange: '#ea580c',
          green: '#16a34a',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.65)',
          'light-hover': 'rgba(255, 255, 255, 0.85)',
          border: 'rgba(255, 255, 255, 0.4)',
          'border-strong': 'rgba(255, 255, 255, 0.75)',
          dark: 'rgba(15, 23, 42, 0.75)',
          'dark-border': 'rgba(255, 255, 255, 0.12)',
        },
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
        'glass-md': '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        'glass-lg': '0 16px 48px 0 rgba(31, 38, 135, 0.18)',
        'glass-glow': '0 0 24px 0 rgba(59, 107, 255, 0.25)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
};
