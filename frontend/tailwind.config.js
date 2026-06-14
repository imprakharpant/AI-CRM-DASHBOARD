/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: ['light', 'dark'],
  theme: {
    extend: {
      colors: {
        'deep-space': 'var(--color-deep-space)',
        'surface': 'var(--color-surface)',
        'elevated': 'var(--color-elevated)',
        'border-subtle': 'var(--color-border-subtle)',
        'accent': {
          DEFAULT: 'var(--color-accent)',
          light: 'var(--color-accent-light)',
          muted: 'var(--color-accent-muted)',
        },
        'warm': {
          DEFAULT: 'var(--color-warm)',
          muted: 'var(--color-warm-muted)',
        },
        'txt': {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 2px 6px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)',
        'glow-accent': '0 0 24px -4px rgba(99, 102, 241, 0.3)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}
