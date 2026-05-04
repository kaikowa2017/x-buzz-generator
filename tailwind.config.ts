import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        horror: {
          bg: '#0a0a0a',
          card: '#141414',
          border: '#2a2a2a',
          red: '#dc2626',
          'red-dark': '#991b1b',
          'red-light': '#ef4444',
          text: '#f0f0f0',
          muted: '#888888',
          accent: '#ff0000',
        },
      },
      fontFamily: {
        horror: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
