/** Tokens issus de VetePro_v4.html (couche « design system v3 ») */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1f2b',
        deep: '#0b2a30',
        brand: { DEFAULT: '#0e7c7b', light: '#12a09d', pale: '#e3f5f3', text: '#0a6463', accent: '#5fe0d6' },
        amber: { DEFAULT: '#b45f06', pale: '#fff1dc', text: '#98520a' },
        danger: { DEFAULT: '#c8372d', pale: '#fde8e6', text: '#a82c24' },
        violet: { DEFAULT: '#6552c9', pale: '#efecfb', text: '#5442ae' },
        info: { DEFAULT: '#2368d4', pale: '#e6effd', text: '#1c55b0' },
        slate: { DEFAULT: '#5b6b78', soft: '#eaeff3', text: '#52616d' },
        faint: '#8794a0',
        mist: '#f3f6f8',
        line: '#e1e8ed',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: { sm2: '8px', md2: '12px', lg2: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(11,42,48,.05), 0 4px 16px rgba(11,42,48,.06)',
        pop: '0 24px 60px rgba(11,42,48,.22)',
        ring: '0 0 0 3px rgba(14,124,123,.22)',
      },
    },
  },
  plugins: [],
};
