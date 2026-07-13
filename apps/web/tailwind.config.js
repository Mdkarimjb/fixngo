/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // FixNGo design system (design-system/fixngo/MASTER.md via ui-ux-pro-max).
      // Semantic tokens follow the shadcn/ui + 21st.dev convention.
      colors: {
        // `brand` now aligns with the design system primary (Trust & Authority blue).
        brand: { DEFAULT: '#1e40af', dark: '#1e3a8a' },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: 'var(--secondary)',
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        ring: 'var(--ring)',
        destructive: 'var(--destructive)',
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
        heading: ['EB Garamond', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
