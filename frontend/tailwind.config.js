/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Flexibits Brand & Accent tokens
        'brand-blue': '#408fff',
        'brand-gold': '#ffaa00',
        'brand-yellow': '#ffcc02',
        'brand-sky': '#3399ff',
        'brand-violet': '#5856d6',
        'brand-tint': '#edf5ff',

        // Neutrals
        black: '#000000',
        night: '#1c1c1e',
        ink: '#1d1e1f',
        muted: '#8a8a8e',
        edge: '#cccccc',
        'stage-gray': '#ebebeb',
        control: '#f4f4f5',
        'card-gray': '#f7f7f7',
        canvas: '#ffffff',

        // Dark theme variants
        'dark-canvas': '#27282a',
        'dark-card': '#3d3e3f',
        'dark-muted': '#9c9ca3',
        'dark-proof': '#5656d4',
        'warm-stage': '#f7ce46',

        // Legacy compatibility mappings
        'midnight-pine': '#1d1e1f',
        'arctic-mist': '#ebebeb',
        'canvas-white': '#ffffff',
        'zenith-teal': '#408fff',
        'pale-mint': '#edf5ff',
        'pale-amber': '#f7f7f7',
        'soft-stone': '#8a8a8e',
      },
      fontFamily: {
        effra: ['"Effra"', 'Lato', 'Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        lora: ['"Lora"', 'serif'],
        mint: ['"Effra"', 'Lato', 'Outfit', 'Inter', 'sans-serif'],
        grenette: ['"Effra"', 'Lato', 'Outfit', 'sans-serif'],
      },
      borderRadius: {
        pill: '24px',
        card: '20px',
        widget: '28px',
        plan: '40px',
        closing: '50px',
        cards: '20px',
        buttons: '24px',
        elements: '16px',
      },
      boxShadow: {
        'portrait-lift': 'rgba(0, 0, 0, 0.1) 0px 16px 32px -12px',
        'segment': 'rgba(0, 0, 0, 0.1) 0px 8px 16px -8px',
        'theater': '0 20px 40px -15px rgba(0,0,0,0.07)',
        'glow-blue': '0 10px 25px -5px rgba(64, 143, 255, 0.35)',
        'glow-violet': '0 10px 25px -5px rgba(88, 86, 214, 0.35)',
        'glow-yellow': '0 10px 25px -5px rgba(255, 204, 2, 0.35)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-reverse': 'floatRev 7s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        floatRev: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(10px)' },
        },
      },
    },
  },
  plugins: [],
};
