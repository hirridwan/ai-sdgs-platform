/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0B1F3A',
        'ink-2': '#12294D',
        teal: '#17A398',
        amber: '#F4A340',
        coral: '#E85D4E',
        paper: '#F6F3EC',
        slate: '#8291A8',
        line: 'rgba(246,243,236,0.14)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}