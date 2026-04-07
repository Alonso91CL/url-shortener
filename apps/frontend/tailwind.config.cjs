/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          50: 'oklch(99% 0.005 60)',
          100: 'oklch(97% 0.008 60)',
          200: 'oklch(93% 0.012 60)',
          300: 'oklch(88% 0.015 60)',
          400: 'oklch(78% 0.02 60)',
          500: 'oklch(68% 0.025 60)',
          600: 'oklch(55% 0.03 60)',
          700: 'oklch(45% 0.03 60)',
          800: 'oklch(35% 0.025 60)',
          900: 'oklch(25% 0.02 60)',
          950: 'oklch(15% 0.01 60)',
        },
        ink: {
          100: 'oklch(98% 0.005 250)',
          300: 'oklch(85% 0.01 250)',
          400: 'oklch(75% 0.015 250)',
          500: 'oklch(65% 0.02 250)',
          600: 'oklch(55% 0.025 250)',
          700: 'oklch(40% 0.02 250)',
          800: 'oklch(25% 0.015 250)',
          900: 'oklch(15% 0.01 250)',
        },
        accent: {
          50: 'oklch(97% 0.02 270)',
          100: 'oklch(94% 0.04 270)',
          200: 'oklch(88% 0.08 270)',
          300: 'oklch(80% 0.12 270)',
          400: 'oklch(72% 0.18 270)',
          500: 'oklch(65% 0.22 270)',
          600: 'oklch(58% 0.20 270)',
          700: 'oklch(50% 0.18 270)',
          800: 'oklch(42% 0.15 270)',
          900: 'oklch(35% 0.12 270)',
        },
        brand: {
          50: 'oklch(97% 0.02 270)',
          100: 'oklch(94% 0.04 270)',
          200: 'oklch(88% 0.08 270)',
          300: 'oklch(80% 0.12 270)',
          400: 'oklch(72% 0.18 270)',
          500: 'oklch(65% 0.22 270)',
          600: 'oklch(58% 0.20 270)',
          700: 'oklch(50% 0.18 270)',
          800: 'oklch(42% 0.15 270)',
          900: 'oklch(35% 0.12 270)',
        },
        success: {
          DEFAULT: 'oklch(70% 0.18 145)',
          light: 'oklch(92% 0.08 145)',
          dark: 'oklch(45% 0.12 145)',
        },
        error: {
          DEFAULT: 'oklch(60% 0.22 25)',
          light: 'oklch(94% 0.08 25)',
          dark: 'oklch(45% 0.18 25)',
        },
        warning: {
          DEFAULT: 'oklch(80% 0.18 85)',
          light: 'oklch(94% 0.08 85)',
          dark: 'oklch(55% 0.15 85)',
        },
        info: {
          DEFAULT: 'oklch(65% 0.18 250)',
          light: 'oklch(94% 0.06 250)',
          dark: 'oklch(45% 0.12 250)',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'display': ['clamp(2.5rem, 5vw + 1rem, 4.5rem)', { lineHeight: '1.05' }],
        'display-sm': ['clamp(1.75rem, 3vw + 0.5rem, 2.5rem)', { lineHeight: '1.1' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px oklch(0% 0 0 / 0.04), 0 4px 24px oklch(0% 0 0 / 0.06)',
        'lift': '0 4px 12px oklch(0% 0 0 / 0.06), 0 8px 32px oklch(0% 0 0 / 0.08)',
        'glow': '0 0 0 3px oklch(65% 0.18 270 / 0.3)',
        'glow-sm': '0 0 12px oklch(65% 0.22 270 / 0.25)',
        'glow-lg': '0 0 40px oklch(65% 0.22 270 / 0.2)',
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'radial-gradient': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.03)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'in-out-expo': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
};
