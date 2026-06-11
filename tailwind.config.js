/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D1117',
        panel: '#161B22',
        inspector: '#1C2128',
        border: '#30363D',
        cyan: '#00BCD4',
        amber: '#F59E0B',
        danger: '#F85149',
        success: '#3FB950',
        primary: '#E6EDF3',
        muted: '#8B949E',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        amberFlash: {
          '0%': { backgroundColor: 'rgba(245, 158, 11, 0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        amberFlash: 'amberFlash 300ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
