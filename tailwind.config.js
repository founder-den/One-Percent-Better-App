/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:         'var(--bg)',
        'bg-card':  'var(--bg-card)',
        'bg-card2': 'var(--bg-card2)',
        surface:    'var(--surface)',
        primary:    'var(--text)',
        muted:      'var(--text-muted)',
        border:     'var(--border)',
        gold:       'var(--gold)',
        'gold-l':   'var(--gold-light)',
        'gold-d':   'var(--gold-dim)',
        danger:     'var(--error)',
        ok:         'var(--success)',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.35)',
        gold: '0 4px 14px rgba(45,106,79,0.35)',
      },
      borderRadius: {
        card: '14px',
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%,100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%':     { opacity: '0.9', transform: 'scale(1.08)' },
        },
      },
    },
  },
  plugins: [],
};
