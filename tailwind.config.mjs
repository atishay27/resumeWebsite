/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a1628',
          800: '#0f1f38',
          700: '#16294a',
          600: '#1e3a5f',
        },
        slate2: {
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
        },
        accent: {
          DEFAULT: '#38bdf8',
          2: '#818cf8',
        },
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      maxWidth: {
        content: '1080px',
      },
      keyframes: {
        pulseDot: {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.35)', opacity: '0.6' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
        scrolldot: {
          '0%': { opacity: '0', transform: 'translateY(0)' },
          '40%': { opacity: '1' },
          '80%': { opacity: '0', transform: 'translateY(10px)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 2.4s infinite',
        floaty: 'floaty 5s ease-in-out infinite',
        spinSlow: 'spinSlow 12s linear infinite',
        scrolldot: 'scrolldot 1.6s infinite',
      },
    },
  },
  plugins: [],
};
