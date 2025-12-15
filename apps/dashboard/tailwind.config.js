/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00fff7',
        'neon-pink': '#ff00ff',
        'neon-green': '#39ff14',
        'neon-orange': '#ff6600',
        'soc-dark': '#0a0e17',
        'soc-darker': '#060912',
        'soc-card': '#111827',
        'soc-border': '#1f2937',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00fff7, 0 0 10px #00fff7' },
          '100%': { boxShadow: '0 0 10px #00fff7, 0 0 20px #00fff7, 0 0 30px #00fff7' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'neon-gradient': 'linear-gradient(135deg, #00fff7 0%, #ff00ff 50%, #ff6600 100%)',
      }
    },
  },
  plugins: [],
}
