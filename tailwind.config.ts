import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      colors: {
        bg: {
          base: '#0a0c10',
          surface: '#0f1219',
          elevated: '#141820',
          border: '#1e2535',
          hover: '#1a2030',
        },
        accent: {
          amber: '#c8962a',
          'amber-bright': '#e8b040',
          'amber-dim': '#7a5a18',
          blue: '#4a7fc0',
          green: '#3a9060',
          red: '#c04040',
        },
        text: {
          primary: '#e8e0d4',
          secondary: '#9a9080',
          muted: '#5a5448',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'pulse-amber': 'pulseAmber 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseAmber: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200, 150, 42, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(200, 150, 42, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
