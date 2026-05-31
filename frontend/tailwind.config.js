/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff7ff',
          100: '#dceeff',
          200: '#b8dcff',
          300: '#85c1ff',
          400: '#4f9eff',
          500: '#2179f6',
          600: '#125ce0',
          700: '#0f48b3',
          800: '#103e8b',
          900: '#11366f',
        },
      },
    },
  },
  plugins: [],
};
