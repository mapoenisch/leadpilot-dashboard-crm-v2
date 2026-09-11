/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        'background-deep': 'var(--color-bg-deep)',
        // Rohfarben-Basis (keine Default-Kollision: bg-black/bg-white/text-black
        // werden repo-weit nicht genutzt; white == Tailwind-Default).
        black: 'var(--black)',
        white: 'var(--white)',
        charcoal: 'var(--charcoal)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          glass: 'var(--color-surface-glass)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          soft: 'var(--color-border-soft)',
          glass: 'var(--color-border-glass)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          soft: 'var(--color-accent-soft)',
          'soft-fill': 'var(--color-accent-soft-fill)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          soft: 'var(--color-error-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        // Marken-Rohfarben (Charts/Domain): keine Default-Skalen-Nutzung im
        // Repo (verifiziert), daher eigene Gruppen statt Skalen-Overwrite.
        cyan: {
          DEFAULT: 'var(--cyan)',
          light: 'var(--cyan-light)',
          a12: 'var(--cyan-a12)',
        },
        orange: {
          DEFAULT: 'var(--orange)',
          light: 'var(--orange-light)',
          soft: 'var(--orange-soft)',
          a14: 'var(--orange-a14)',
        },
        coral: {
          DEFAULT: 'var(--coral-red)',
          a14: 'var(--coral-red-a14)',
        },
        mint: {
          DEFAULT: 'var(--mint-green)',
          a14: 'var(--mint-green-a14)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
        'glow-cyan-strong': 'var(--shadow-glow-cyan-strong)',
        'glow-orange': 'var(--shadow-glow-orange)',
        // focus-ring ist ein kompletter Shadow-Wert (wird als boxShadow
        // verwendet, nicht als Ring-Farbe) — daher hier, nicht ringColor.
        'focus-ring': 'var(--focus-ring)',
      },
      backdropBlur: {
        DEFAULT: 'var(--backdrop-blur)',
        sm: 'var(--backdrop-blur-sm)',
      },
    },
  },
  plugins: [],
};
