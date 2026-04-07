import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Segment colours — mirrors simulation dashboard
        seg: {
          qsr:        '#f59e0b',
          restaurant: '#ef4444',
          other:      '#8b5cf6',
          darkstore:  '#0ea5e9',
        },
        brand: {
          green: '#22c55e',
          'green-light': '#f0fdf4',
          dark:  '#1a2e1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
