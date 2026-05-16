import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#08090d',
          soft: '#0c0e14',
        },
        surface: {
          DEFAULT: '#11131c',
          hover: '#171a26',
          raised: '#1b1e2c',
        },
        border: {
          DEFAULT: '#222536',
          strong: '#323648',
        },
        content: {
          DEFAULT: '#e9eaf0',
          muted: '#9b9eb3',
          subtle: '#6a6d82',
        },
        brand: {
          DEFAULT: '#7c6bff',
          hover: '#6a57f5',
          soft: '#9d90ff',
          ring: '#7c6bff',
        },
        accent: {
          DEFAULT: '#2dd4bf',
        },
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,107,255,0.18), 0 18px 60px -20px rgba(124,107,255,0.45)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 50px -28px rgba(0,0,0,0.9)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,107,255,0.16), transparent 70%)',
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
