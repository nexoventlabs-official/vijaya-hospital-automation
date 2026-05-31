/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'midnight-pine': '#061d29',
        'arctic-mist': '#e5e7eb',
        'canvas-white': '#ffffff',
        'zenith-teal': '#006e75',
        'pale-mint': '#b9ffe8',
        'pale-amber': '#fffded',
        'soft-stone': '#425d6d',
        'rose-sunset': '#ffb0a4',
        'warm-berry': '#4d0037',
        'soft-magenta': '#ffc3e6',
        'ocean-glimmer': '#0b978e',
        // Preserve a brand color key in case any backend data features it, but map it gracefully
        brand: {
          50: '#fffded',
          100: '#b9ffe8',
          500: '#006e75',
          600: '#006e75',
          700: '#0b978e',
          900: '#061d29',
        }
      },
      fontFamily: {
        mint: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        grenette: ['Outfit', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        cards: '24px',
        buttons: '8px',
        elements: '12px',
      }
    },
  },
  plugins: [],
};
