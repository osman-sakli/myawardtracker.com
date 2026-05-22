import type { Config } from 'tailwindcss';

/**
 * Light-first palette tuned for an educational/productivity SaaS feel —
 * soft blue, white, light gray, gentle contrast. Dark mode is opt-in via
 * the `class` strategy: add `dark` to <html> to flip every token.
 *
 * Anywhere the legacy components reference `bg`, `surface`, `border`,
 * `content`, `brand` — those tokens still exist, just rebalanced for light
 * use. Existing screens render without code changes; they just feel calmer.
 */

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f7f8fb',
          soft: '#ffffff',
        },
        surface: {
          DEFAULT: '#ffffff',
          hover: '#f1f4fa',
          raised: '#fbfcfe',
        },
        border: {
          DEFAULT: '#e3e8f0',
          strong: '#cbd2e0',
        },
        content: {
          DEFAULT: '#1b2230',
          muted: '#5b6478',
          subtle: '#8a93a6',
        },
        brand: {
          DEFAULT: '#3b6df0',
          hover: '#2f5be0',
          soft: '#dbe6ff',
          ring: '#3b6df0',
        },
        accent: {
          DEFAULT: '#0fb5a8',
        },
        // Extra accent tones used by the marketing pages to break the
        // single-brand-color monotony of the dashboard chrome.
        teal: '#0fb5a8',
        coral: '#fb7185',
        sun: '#f59e0b',
        violet: '#8b5cf6',
        mint: '#34d399',
        sky: '#38bdf8',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,109,240,0.18), 0 18px 60px -28px rgba(59,109,240,0.35)',
        card: '0 1px 0 0 rgba(15,23,42,0.04), 0 12px 32px -22px rgba(15,23,42,0.18)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,109,240,0.12), transparent 70%)',
        // Marketing-page hero glow: soft blue → teal → coral aurora.
        'aurora':
          'radial-gradient(ellipse 80% 50% at 20% 30%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse 70% 55% at 80% 20%, rgba(15,181,168,0.18), transparent 60%), radial-gradient(ellipse 60% 45% at 50% 90%, rgba(251,113,133,0.14), transparent 60%)',
        'brand-mint':
          'linear-gradient(135deg, #3b6df0 0%, #0fb5a8 100%)',
        'sunset':
          'linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)',
        'lavender':
          'linear-gradient(135deg, #8b5cf6 0%, #38bdf8 100%)',
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
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.5s ease both',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
