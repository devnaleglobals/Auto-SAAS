/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Theme tokens: values live in app/globals.css (:root = light, .dark = dark)
        ink: 'rgb(var(--ink) / <alpha-value>)',             // main text (flips in dark mode)
        navy: 'rgb(var(--navy) / <alpha-value>)',           // brand navy surfaces: sidebar, dark buttons, chat bubbles
        inkSoft: 'rgb(var(--ink-soft) / <alpha-value>)',    // navy hover
        slate: 'rgb(var(--slate) / <alpha-value>)',         // secondary text
        canvas: 'rgb(var(--canvas) / <alpha-value>)',       // page background
        surface: 'rgb(var(--surface) / <alpha-value>)',     // cards and panels
        line: 'rgb(var(--line) / <alpha-value>)',           // borders
        marigold: 'rgb(var(--marigold) / <alpha-value>)',
        marigoldDark: 'rgb(var(--marigold-dark) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        sky: 'rgb(var(--sky) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],   // 13
        sm: ['0.9375rem', { lineHeight: '1.4rem' }],    // 15
        base: ['1.0625rem', { lineHeight: '1.65rem' }], // 17
        lg: ['1.25rem', { lineHeight: '1.75rem' }],     // 20
        xl: ['1.5625rem', { lineHeight: '2rem' }],      // 25
        '2xl': ['2rem', { lineHeight: '2.4rem' }],      // 32
        '3xl': ['2rem', { lineHeight: '2.4rem' }],
        '4xl': ['2.75rem', { lineHeight: '3rem' }],     // 44
        '5xl': ['2.75rem', { lineHeight: '3rem' }],
        '7xl': ['4rem', { lineHeight: '4.1rem' }],      // 64
      },
      boxShadow: {
        lift: '0 1px 2px rgba(23,32,54,.06), 0 8px 24px -12px rgba(23,32,54,.18)',
        pop: '0 12px 40px -12px rgba(23,32,54,.35)',
      },
      keyframes: {
        'toast-in': { from: { opacity: 0, transform: 'translateY(8px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'dialog-in': { from: { opacity: 0, transform: 'translateY(6px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'toast-in': 'toast-in .22s cubic-bezier(.2,.8,.2,1)',
        'dialog-in': 'dialog-in .18s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in .18s ease-out',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
